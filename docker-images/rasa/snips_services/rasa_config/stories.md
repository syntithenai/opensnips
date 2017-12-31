## clear_the_playlist
* clear_the_playlist
    - utter_confirm_clear_playlist
* agree
    - utter_clearing_the_playlist

## create_a_playlist
* create_a_playlist
- utter_ask_new_playlist_name
* create_a_playlist[playlist=juggling]
- utter_ok_creating_a_playlist

## create_a_playlist_directly
* create_a_playlist[playlist=juggling]
- utter_ok_creating_a_playlist

## add_to_playlist
* add_to_playlist
- utter_add_to_playlist_ask_name
* add_to_playlist[playlist=juggling]
- utter_adding_to_playlist

## set_current_view
* current_view[viewpage=home]
- utter_set_current_view

## define_genre
* define_genre
- utter_genre_definition
* define_genre[genre=jazz]
- utter_genre_definition

## delete_song_from_collection
* delete_song_from_collection
- utter_confirm_delete_song_from_collection
* agree
- utter_deleting_song_from_collection

## delete_playlist
* delete_playlist
- utter_delete_playlist_ask_name
* delete_playlist[playlist=juggling]
- utter_confirm_delete_playlist
* agree
- utter_delete_playlist

## remove_song_from_playlist
- utter_confirm_delete_song_from_playlist
* agree
- utter_deleting_song_from_playlist

## add_to_favorites
* favorite_add_this
- utter_confirm_favorite_add_this
* agree
- utter_favorite_adding_this

## remove_favorite
* favorite_remove_this
- utter_confirm_favorite_remove_this
* agree
- utter_favorite_removing_this

## goto_next_track
* goto_next_track
- utter_ok_goto_next_track

## goto_previous_track
* goto_previous_track
- utter_ok_goto_previous_track

## help
* help
- utter_help

## open_a_playlist
* open_playlist
- utter_open_playlist_ask_name
* open_playlist[playlist=juggling]
- utter_open_playlist

## pause
* pause
- utter_ok_pause

## play_all
* play_all
- utter_confirm_play_all
* agree
- utter_playing_all

## play_by_criteria
* play_all_my_favorites
- utter_playing_all_my_favorites

## play_by_artist
* play_music_by_artist
- utter_playing_music_by_artist_ask_name
* play_music_by_artist[artist=Queen]
- utter_playing_music_by_artist

## play_by_album
* play_music_from_album
- utter_playing_music_from_album_ask_name
* play_music_from_album[album=Fun Stuff]
- utter_playing_music_from_album

## play_by_genre
* play_music_genre
- utter_playing_music_genre_ask_name
* play_music_genre[genre=Jazz]
- utter_playing_music_genre

## play_by_genre2
* play_music_genre[genre=Jazz]
- utter_playing_music_genre

## play_next
* play_next
- utter_playing_next

## play_previous
* play_previous
- utter_playing_previous

## play_random
* play_random_music
- utter_playing_random_music
- utter_playing_song

# play_song direct
* play_song[song=Tulips]
- utter_playing_song

# play_song
* play_song
- utter_playing_song_ask_name
* play_song[song=Tulips]
- utter_playing_song

