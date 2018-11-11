.PHONY: clean test lint

TEST_PATH=./

help:
	@echo "    train-nlu"
	@echo "        Train the natural language understanding using Rasa NLU."
	@echo "    train-core"
	@echo "        Train a dialogue model using Rasa core."
	@echo "    run"
	@echo "        Run cli dialogue."

train-nlu:
	python -m rasa_nlu.train -c config.json --fixed_model_name current

train-slots:
	python -m rasa_nlu.train -c config-slots.json --fixed_model_name slots

run-slots:
	python -m rasa_nlu.server -c config-slots.json


train-core:
	python -m rasa_core.train -s stories.md -d domain.yml -o models/dialogue --epochs 300

run:
	python -m rasa_core.run -d models/dialogue -u models/default/current
