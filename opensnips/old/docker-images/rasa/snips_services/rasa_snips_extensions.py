#!/usr/local/bin/python
# -*-: coding utf-8 -*-
""" Snips core and nlu server. """
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

from rasa_core.agent import Agent
import os
import os.path
import re

from rasa_core.domain import TemplateDomain
from rasa_core.featurizers import Featurizer
from rasa_core.interpreter import NaturalLanguageInterpreter
from rasa_core.policies.ensemble import  PolicyEnsemble
from rasa_core.utils import read_yaml_file
from rasa_core.policies.keras_policy import KerasPolicy
from rasa_core.policies.memoization import MemoizationPolicy

from rasa_nlu.utils.md_to_json import MarkdownToJson
from rasa_nlu.utils.md_to_json import comment_regex,synonym_regex,intent_regex,INTENT_PARSING_STATE,SYNONYM_PARSING_STATE


# Customised Agent class to use custom SnipsDomain and pass core server through to the Domain for scope access
class SnipsMqttAgent(Agent):
    
    @staticmethod
    # for training
    # tracker_store=None,,core_server=None
    def createAgent(path, interpreter=None, featurizer = None,policies =[MemoizationPolicy(), KerasPolicy()],action_factory = 'snips_factory.snips_action_factory', tracker_store = None):
        print ('CRETE AGENT {}'.format(path))
        # type: (Text, Any, Optional[TrackerStore]) -> Agent
        if path is None:
            raise ValueError("No domain path specified.")
        domain = SnipsDomain.load(os.path.join(path, "domain.yml"),action_factory)
        # ensures the domain hasn't changed between test and train
        #domain.compare_with_specification(path)
        #featurizer = self._create_featurizer(featurizer)
        #ensemble = self._create_ensemble(policies)
        #_interpreter = NaturalLanguageInterpreter.create(interpreter)
        #_tracker_store = None #SnipsMqttAgent.create_tracker_store(tracker_store, domain)
        print("CREATED SNIPS AGENT")
        return SnipsMqttAgent(domain, policies, featurizer, interpreter, tracker_store)

    
    @staticmethod
    # for lookup
    def loadAgent(path, interpreter=None, tracker_store=None,action_factory=None,core_server=None):
        # type: (Text, Any, Optional[TrackerStore]) -> Agent
        if path is None:
            raise ValueError("No domain path specified.")
        domain = SnipsDomain.load(os.path.join(path, "domain.yml"),action_factory,core_server)
        # ensures the domain hasn't changed between test and train
        domain.compare_with_specification(path)
        featurizer = Featurizer.load(path)
        ensemble = PolicyEnsemble.load(path, featurizer)
        _interpreter = NaturalLanguageInterpreter.create(interpreter)
        _tracker_store = SnipsMqttAgent.create_tracker_store(tracker_store, domain)
        print("CREATED SNIPS AGENT")
        return SnipsMqttAgent(domain, ensemble, featurizer, _interpreter, _tracker_store)

# Customised Domain to allow reference to core server for access to sessionId and other server scope.    
class SnipsDomain(TemplateDomain):
    def __init__(self, intents, entities, slots, templates, action_classes,
                 action_names, action_factory, topics, core_server = None, **kwargs):
        self._intents = intents
        self._entities = entities
        self._slots = slots
        self._templates = templates
        self._action_classes = action_classes
        self._action_names = action_names
        self._factory_name = action_factory
        self.core_server = core_server
        self._actions = self.instantiate_actions(
                action_factory, action_classes, action_names, templates)
        print("CREATED SNIPS DOMAIN")
        super(TemplateDomain, self).__init__(topics, **kwargs)

    @classmethod
    def load(cls, filename, action_factory=None,core_server=None):
        if not os.path.isfile(filename):
            raise Exception(
                    "Failed to load domain specification from '{}'. "
                    "File not found!".format(os.path.abspath(filename)))

        cls.validate_domain_yaml(filename)
        data = read_yaml_file(filename)
        utter_templates = cls.collect_templates(data.get("templates", {}))
        if not action_factory:
            action_factory = data.get("action_factory", None)
        topics = [Topic(name) for name in data.get("topics", [])]
        slots = cls.collect_slots(data.get("slots", {}))
        additional_arguments = data.get("config", {})
        print("LOADED SNIPS DOMAIN")
        return SnipsDomain(
                data.get("intents", []),
                data.get("entities", []),
                slots,
                utter_templates,
                data.get("actions", []),
                data.get("action_names", []),
                action_factory,
                topics,
                core_server,
                **additional_arguments
        )
        
        
class SnipsMarkdownToJson(MarkdownToJson):
    def __init__(self, markdown):
        self.markdown = markdown
        # set when parsing examples from a given intent
        self.current_intent = None
        self.common_examples = []
        self.entity_synonyms = []
        self.interpret(markdown)

    def interpret(self,markdown):
        """Parse the content of the actual .md file."""
        from rasa_nlu.utils.md_to_json import strip_comments

        f_com_rmved = strip_comments(comment_regex,self.markdown)# Strip comments
        for row in f_com_rmved:
            # Remove white-space which may have crept in due to comments
            row = row.strip() 
            intent_match = re.search(intent_regex, row)
            if intent_match is not None:
                self._set_current_state(
                        INTENT_PARSING_STATE, intent_match.group(1))
                continue

            synonym_match = re.search(synonym_regex, row)
            if synonym_match is not None:
                self._set_current_state(
                        SYNONYM_PARSING_STATE, synonym_match.group(1))
                continue
            print("PARSE NLU ROW {}".format(row))
            self._parse_intent_or_synonym_example(row)
        return {
            "rasa_nlu_data": {
                "common_examples": self.common_examples,
                "entity_synonyms": self.entity_synonyms
            }
        }
