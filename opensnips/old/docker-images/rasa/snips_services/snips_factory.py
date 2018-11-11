#!/usr/local/bin/python

import rasa_core.utils 
from rasa_core.actions.action import UtterAction
from rasa_core.actions.action import ActionListen
from snips_action import SnipsMqttAction

def snips_action_factory(action_classes, action_names, utter_templates):
    # type: (List[Text], List[Text], List[Text]) -> List[Action]
    """Converts the names of actions into class instances."""
    print('SNIPSACTIONFACTORY')
    def _action_class(action_name):
        
        # type: (Text) -> Action
        """Tries to create an instance by importing and calling the class."""

        try:
            cls = utils.class_from_module_path(action_name)
            return cls()
        except ImportError as e:
            raise ValueError(
                    "Action '{}' doesn't correspond to a template / action. "
                    "Remember to prefix actions that should utter a template "
                    "with `utter_`. Error: {}".format(action_name, e))
        except (AttributeError, KeyError) as e:
            raise ValueError(
                    "Action '{}' doesn't correspond to a template / action. "
                    "Module doesn't contain a class with this name. "
                    "Remember to prefix actions that should utter a template "
                    "with `utter_`. Error: {}".format(action_name, e))

    actions = []

    for name in action_classes:
        if name.startswith('ask_') or name.startswith('askslot_') or name.startswith('choose_')  or name.startswith('capture_') or name.startswith('say_'):
            actions.append(SnipsMqttAction(name))
            if not name.startswith('say_'):
               pass
               # actions.append(ActionListen())
        elif name in utter_templates:
            #pass
            actions.append(UtterAction(name))
        else:
            actions.append(_action_class(name))
    print(actions)
    return actions

