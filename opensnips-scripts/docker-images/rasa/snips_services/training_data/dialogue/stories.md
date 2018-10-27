## clear_the_playlist
* clear_the_playlist
    - ask_confirm_clear_playlist
* agree
    - say_clearing_the_playlist
    - action_restart

## clear_the_playlist
* clear_the_playlist
    - ask_confirm_clear_playlist
* disagree
    - say_cancelled
    - action_restart

## create_a_playlist
* create_a_playlist
- ask_name_for_create_playlist
* create_a_playlist[playlist=juggling]
- say_ok_creating_a_playlist
- action_restart

## create_a_playlist_directly
* create_a_playlist[playlist=juggling]
- say_ok_creating_a_playlist
- action_restart
