import os
import sys
import subprocess
import json
from natsort import natsorted

provider = sys.argv[1]
space = sys.argv[2]
token = sys.argv[3]
files = int(sys.argv[4])
directory = sys.argv[5]

studies_dir = 'studies'
data_object_dir = 'data_objects'

FNULL = open(os.devnull, 'w')

curl = [
  'curl',
  '-k',
  '-H', 'X-Auth-Token: ' + token,
  '-H', 'X-CDMI-Specification-Version: 1.1.1',
  '-H', 'Content-Type: application/cdmi-container',
  '-X', 'DELETE',
  'https://' + provider + '/cdmi/' + space + '/' + directory + '/'
]

remove_dir_proc = subprocess.Popen(curl, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
remove_dir_proc.wait()

curl = [
  'curl',
  '-k',
  '-H', 'X-Auth-Token: ' + token,
  '-H', 'X-CDMI-Specification-Version: 1.1.1',
  '-H', 'Content-Type: application/cdmi-container',
  '-X', 'PUT',
  'https://' + provider + '/cdmi/' + space + '/' + directory + '/'
]
create_dir_proc = subprocess.Popen(curl, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
create_dir_proc.wait()

processes = []
for source in [studies_dir, data_object_dir]:
  index = 0
  for (dirpath, _, filenames) in os.walk(source):
    filenames = natsorted(filenames)
    for filename in filenames[:files]:
      path = dirpath + '/' + filename
      with open(path, 'r') as json_file:
        metadata = json_file.read()
        metadata_json = json.loads(metadata)
        if metadata_json['object_type'] == 'study':
          linked_data_objects = metadata_json['linked_data_objects']
          start_id = linked_data_objects[0]['id']
          for i in range(1, 20):
            linked_data_objects.append({ 'id': start_id + i })
        else:
          related_studies = metadata_json['related_studies']
          start_id = related_studies[0]['id']
          for i in range(1, 20):
            related_studies.append({ 'id': start_id - i })
        curl = [
          'curl',
          '-k',
          '-H', 'X-Auth-Token: ' + token,
          '-H', 'X-CDMI-Specification-Version: 1.1.1',
          '-H', 'Content-Type: application/cdmi-object',
          '-X', 'PUT',
          '-d', '{"metadata": {"onedata_json": ' + json.dumps(metadata_json) + '}}',
          'https://' + provider + '/cdmi/' + space + '/' + directory + '/' + filename
        ]
        processes.append(subprocess.Popen(curl, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
for proc in processes:
  proc.wait()
