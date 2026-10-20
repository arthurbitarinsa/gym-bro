#!/usr/bin/env python3
"""Belgium-wide gym import from OpenStreetMap.  Gym data (c) OpenStreetMap contributors, ODbL.

  python3 tools/import_gyms.py            # dry run: download, clean, write tools/gyms_import.json, print stats
  python3 tools/import_gyms.py --upload   # same, then insert new gyms (needs SUPABASE_SERVICE_KEY in your shell)
  python3 tools/import_gyms.py --refresh  # ignore the local download cache

Run it from apps/mobile (it reads EXPO_PUBLIC_SUPABASE_URL / ANON_KEY from .env to skip gyms you already have).
"""
import json, math, os, re, sys, time, unicodedata, urllib.request, urllib.parse, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '.gym_cache')
OUT = os.path.join(HERE, 'gyms_import.json')
ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
UA = 'IronMate-gym-import/1.0 (ironmateapp@gmail.com)'

Q_GYMS = '''[out:json][timeout:240];
area["ISO3166-1"="BE"]["admin_level"="2"]->.be;
(
  nwr["leisure"="fitness_centre"](area.be);
  nwr["leisure"="sports_centre"]["sport"~"fitness|gym|weightlifting|bodybuilding|crossfit|powerlifting"](area.be);
  nwr["amenity"="gym"](area.be);
);
out center tags;'''
Q_PLACES = '''[out:json][timeout:240];
area["ISO3166-1"="BE"]["admin_level"="2"]->.be;
node["place"~"^(city|town|village|suburb)$"]["name"](area.be);
out;'''

def overpass(query, name, refresh):
    path = os.path.join(CACHE, name + '.json')
    if os.path.exists(path) and not refresh:
        print(f'  using cached {name}')
        return json.load(open(path, encoding='utf-8'))
    body = urllib.parse.urlencode({'data': query}).encode()
    last = None
    for attempt in range(2):
        for ep in ENDPOINTS:
            try:
                print(f'  downloading {name} from {ep.split("/")[2]} ...')
                req = urllib.request.Request(ep, data=body, headers={'User-Agent': UA})
                with urllib.request.urlopen(req, timeout=300) as r:
                    data = json.loads(r.read().decode('utf-8'))
                os.makedirs(CACHE, exist_ok=True)
                json.dump(data, open(path, 'w', encoding='utf-8'))
                return data
            except Exception as e:
                last = e
                print(f'    failed: {e}')
        time.sleep(10)
    sys.exit(f'ABORT: could not download {name}: {last}')

def norm(s):
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()

def dist_m(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 12742000 * math.asin(math.sqrt(h))

def load_env():
    env = {}
    p = '.env'
    if os.path.exists(p):
        for line in open(p, encoding='utf-8'):
            if '=' in line and not line.strip().startswith('#'):
                k, v = line.strip().split('=', 1)
                env[k] = v.strip().strip('"\'')
    return env

def rest(url, key, path, headers=None, data=None, method='GET'):
    h = {'apikey': key, 'Authorization': 'Bearer ' + key, 'User-Agent': UA}
    h.update(headers or {})
    req = urllib.request.Request(url + '/rest/v1/' + path, data=data, headers=h, method=method)
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read().decode('utf-8')

def existing_gyms(url, key):
    seen, start = set(), 0
    while True:
        h = {'Range-Unit': 'items', 'Range': f'{start}-{start + 999}'}
        rows = json.loads(rest(url, key, 'gyms?select=name,city', headers=h))
        for r in rows:
            seen.add((norm(r.get('name')), norm(r.get('city'))))
        if len(rows) < 1000:
            return seen
        start += 1000

def main():
    refresh = '--refresh' in sys.argv
    upload = '--upload' in sys.argv
    print('1/4 Downloading from OpenStreetMap')
    gyms_raw = overpass(Q_GYMS, 'gyms', refresh)['elements']
    places_raw = overpass(Q_PLACES, 'places', refresh)['elements']
    places = [(p['lat'], p['lon'], p['tags']['name']) for p in places_raw if 'lat' in p]
    print(f'  {len(gyms_raw)} raw gym objects, {len(places)} place names')

    print('2/4 Cleaning')
    kept, stats = [], {'no_name': 0, 'private_or_closed': 0, 'no_coords': 0, 'city_from_nearest_place': 0}
    for e in gyms_raw:
        t = e.get('tags', {})
        name = (t.get('name') or t.get('brand') or '').strip()
        if len(name) < 3:
            stats['no_name'] += 1; continue
        if t.get('access') in ('private', 'no') or t.get('opening_hours') == 'off':
            stats['private_or_closed'] += 1; continue
        lat = e.get('lat') or (e.get('center') or {}).get('lat')
        lon = e.get('lon') or (e.get('center') or {}).get('lon')
        if lat is None or lon is None:
            stats['no_coords'] += 1; continue
        city = (t.get('addr:city') or '').strip()
        if not city and places:
            city = min(places, key=lambda p: (p[0] - lat) ** 2 + ((p[1] - lon) * 0.63) ** 2)[2]
            stats['city_from_nearest_place'] += 1
        if not city:
            city = 'Other'
        street = ' '.join(x for x in (t.get('addr:street'), t.get('addr:housenumber')) if x)
        post = t.get('addr:postcode', '')
        address = ', '.join(x for x in (street, post) if x) or f'{city}, Belgium'
        kept.append({'name': name, 'address': address, 'city': city,
                     'location': f'POINT({lon:.6f} {lat:.6f})', 'osm_id': f"{e['type']}/{e['id']}",
                     'source': 'osm', '_lat': lat, '_lon': lon})

    # the same gym is often mapped twice (a building and a point): same name within 150 m
    groups, uniq, dup = {}, [], 0
    for g in kept:
        groups.setdefault(norm(g['name']), []).append(g)
    for lst in groups.values():
        chosen = []
        for g in lst:
            if any(dist_m((g['_lat'], g['_lon']), (c['_lat'], c['_lon'])) < 150 for c in chosen):
                dup += 1; continue
            chosen.append(g)
        uniq.extend(chosen)

    env = load_env()
    url, anon = env.get('EXPO_PUBLIC_SUPABASE_URL'), env.get('EXPO_PUBLIC_SUPABASE_ANON_KEY')
    skipped = 0
    if url and anon:
        print('3/4 Skipping gyms you already have')
        try:
            have = existing_gyms(url, anon)
            fresh = [g for g in uniq if (norm(g['name']), norm(g['city'])) not in have]
            skipped = len(uniq) - len(fresh); uniq = fresh
            print(f'  {len(have)} gyms already in the database')
        except Exception as e:
            print(f'  could not read existing gyms ({e}); continuing without that check')
    else:
        print('3/4 No .env found here: not checking existing gyms (run from apps/mobile)')

    rows = [{k: v for k, v in g.items() if not k.startswith('_')} for g in sorted(uniq, key=lambda g: (g['city'], g['name']))]
    json.dump(rows, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)

    cities = {}
    for r in rows:
        cities[r['city']] = cities.get(r['city'], 0) + 1
    print('\nSummary')
    print(f'  to import:            {len(rows)}')
    print(f'  duplicates merged:    {dup}')
    print(f'  already in database:  {skipped}')
    print(f'  dropped: {stats["no_name"]} without a name, {stats["private_or_closed"]} private/closed, {stats["no_coords"]} without coordinates')
    print(f'  city guessed from nearest place: {stats["city_from_nearest_place"]}')
    print(f'  cities: {len(cities)}   top 12: ' + ', '.join(f'{c} {n}' for c, n in sorted(cities.items(), key=lambda x: -x[1])[:12]))
    print(f'  written to {OUT}')

    if not upload:
        print('\nDry run only. Look over the file, then run again with --upload.')
        return
    key = os.environ.get('SUPABASE_SERVICE_KEY')
    if not (url and key):
        sys.exit('ABORT: set SUPABASE_SERVICE_KEY in your shell first (export SUPABASE_SERVICE_KEY=...), never paste it in chat.')
    print('4/4 Uploading')
    done = 0
    for i in range(0, len(rows), 500):
        batch = rows[i:i + 500]
        try:
            rest(url, key, 'gyms?on_conflict=osm_id', method='POST', data=json.dumps(batch).encode(),
                 headers={'Content-Type': 'application/json', 'Prefer': 'resolution=ignore-duplicates,return=minimal'})
        except urllib.error.HTTPError as e:
            sys.exit(f'ABORT at row {i}: {e.code} {e.read().decode()[:400]}')
        done += len(batch)
        print(f'  {done}/{len(rows)}')
    print('Done.')

main()
