import requests, os, json

classes = json.load(open('classes.json', 'r'))    

for c in classes:
    url = f'https://storage.googleapis.com/quickdraw-models/sketchRNN/large_models/{c}.gen.json'
    r = requests.get(url)
    with open(f'{c}.json', 'wb') as f:
        f.write(r.content)
  
    with open(f'{c}.json', 'r') as f:
        with open(f'sketch_rnn_model_data/{c}.js', 'w') as w:
            data = f.read().rstrip()
            w.write(f"var {c}_model_data='" + data + "';")

    os.remove(f'{c}.json')
