import random
import json
import os

hostname = '127.0.0.1:9200'
number_of_study_topics = 10
number_of_study_topics_per_study = 4
number_of_studies = 100
number_of_dos = 500
topics_number = 5
types = list('type' + str(i) for i in range(6))
accessTypes = ({'id': 0, 'name': 'Public'}, {'id': 1, 'name': 'Private'})
publishers = list('publisher' + str(i) for i in range(4))
do_types = ('Registry entry', 'Analysis dataset', 'Other dataset')
studies_per_do = 5
founder_ids = [str(i) for i in range(5)]

study_topics = []
for i in range(number_of_study_topics):
  topic_source_type_id = random.randint(0, 10)
  study_topics.append({
    'id': i,
    'topic_source_type': {
      'id': topic_source_type_id,
      'name': 'Topic source type #' + str(topic_source_type_id)
    },
    'value': 'Study topic #' + str(i),
  })

studies = []
for i in range(number_of_studies):
  study_id = i
  studies.append({
    'id': i,
    'title': 'Study no ' + str(i),
    'study_identifiers': [
      {'id': 0, 'value': str(study_id), 'type': 'registryId'},
      {'id': 1, 'value': random.choice(founder_ids), 'type': 'founderId'}
    ],
    'topics': [random.randint(0, (topics_number - 1) // 2), random.randint(((topics_number - 1) // 2) + 1, topics_number - 1)],
    'type': random.choice(types),
    'publisher': random.choice(publishers),
    'year': random.randint(1990, 2019),
    'study_topics': random.sample(study_topics, number_of_study_topics_per_study),
    'linked_data_objects': []
  })
studies_ids = list(study['id'] for study in studies)

dos = []
for i in range(number_of_dos):
  related_studies = random.sample(studies_ids, studies_per_do)
  do_id = i
  for study in studies:
    if study['id'] in related_studies:
      study['linked_data_objects'].append({'id': do_id})
  do_type_id = random.randint(0, len(do_types) - 1)
  do_type = {'id': do_type_id, 'name': do_types[do_type_id]}
  dos.append({
    'id': do_id,
    'type': do_type,
    'description': 'Some description for DO with ID do' + str(i),
    'access_type': random.choice(accessTypes),
    'publication_year': random.randint(1990, 2019),
    'status': random.choice(('success', 'warning')),
    'url': 'https://some-very-important-resource.com/?id=' + str(i),
    'related_studies': [{'id': id} for id in related_studies]
  })

index_creation_body = {
  'studies': { "mappings": { "study": { "properties": { "study_identifiers": { "type": "nested", "properties": { "type": { "type": 'keyword'}, 'value': {'type': 'keyword'}} } } } }},
#   'dos': { "mappings": { "do": { "properties": { "id": { "type": "keyword" } } } }}
}

requests = [{ 'method': 'PUT', 'url': hostname + '/' + index, 'body': json.dumps(index_creation_body[index], ensure_ascii=False) } for index in ['studies']]
# requests = []
for study in studies:
  requests.append({
    'method': 'PUT',
    'url': hostname + '/studies/study/' + str(study['id']) + '/_create',
    'body': json.dumps(study, ensure_ascii=False)
  })
for do in dos:
  requests.append({
    'method': 'PUT',
    'url': hostname + '/dos/do/' + str(do['id']) + '/_create',
    'body': json.dumps(do, ensure_ascii=False)
  })

for request in requests:
  os.system('curl -X' + request['method'] + ' \'' + request['url'] +'\' -H \'Content-Type: application/json\' -d \'' + request['body'] + '\'')
