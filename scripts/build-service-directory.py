import csv,json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]; rows=list(csv.DictReader(open(root/'data/uk-services/hospitals.csv')))
out=[]
for r in rows:
 if not (r['has_accident_and_emergency']=='1' or r['hospital_type']=='urgent'):continue
 if r['ownership_sector']=='Private' or any(s in (r['name']+' '+r['speciality']).lower() for s in ['children','paediatric','psychiatr','mental health','maternity']):continue
 typ={'n':'node','w':'way','r':'relation'}.get(r['osm_id'][0],'node');source='https://www.openstreetmap.org/'+typ+'/'+r['osm_id'][1:]
 url=r['website'];url=url if url.startswith(('https://','http://')) else source
 out.append({'id':'osm-'+r['osm_id'],'name':r['name'],'address':', '.join(x for x in [r['town'],r['admin_district']] if x and x!='N/A'),'postcode':r['postcode'],'latitude':float(r['latitude']),'longitude':float(r['longitude']),'country':r['country'],'phone':r['phone'],'url':url,'sourceUrl':source,'kind':r['hospital_type'],'operator':r['operator']})
(root/'data/uk-services/locations.json').write_text(json.dumps(out,indent=2))
print(len(out), "GB urgent/emergency locations regenerated from the checked-in source CSV")
