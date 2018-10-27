.PHONY: clean test lint

default:
	python -m rasa_nlu.train -c config.json 
	python -m rasa_nlu.train -c config-slots.json 
	python -m rasa_core.train -s stories.md -d domain.yml -o ../models/dialogue --epochs 100
	
	
train-nlu:
	python -m rasa_nlu.train -c config.json -o ../models/nlu

train-core:
	python -m rasa_core.train -s stories.md -d domain.yml -o ../models/dialogue --epochs 100

run:
	python -m rasa_core.run -d models/dialogue -u models/nlu/default -o core.log

train-slots:
	python -m rasa_nlu.train -c config-slots.json -o ../models/nlu

run-slots:
	python -m rasa_nlu.server -c config-slots.json 

run-nlu:
	python -m rasa_nlu.server -c config.json -p models/
