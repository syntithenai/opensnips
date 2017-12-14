FROM syntithenai/snips_base
MAINTAINER Steve Ryan <stever@syntithenai.com>


# system dependancies
RUN  export DEBIAN_FRONTEND="noninteractive" ; apt-get  --allow-unauthenticated update && apt-get -f install && apt-get install  -fyq  --force-yes   virtualenv python-pip python-sklearn python-dev nano apt-transport-https wget dirmngr nano bzip2 git lsb-release supervisor 

# libpng12-0 libpng12-dev  libfreetype6 libfreetype6-dev 
#  && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*;

RUN export DEBIAN_FRONTEND="noninteractive" ;  apt-get -f install && apt-get install  -fyq  --force-yes init-system-helpers

# SNIPS

# SWITCH ON ARCHITECTURE TO SELECT APT SOURCES
RUN if [ `uname -m` = "armv7l" ]; then  bash -c  'echo "deb https://raspbian.snips.ai/$(lsb_release -cs) stable main" > /etc/apt/sources.list.d/snips.list'; apt-key adv --keyserver pgp.mit.edu --recv-keys D4F50CDCA10A2849; elif [ `uname -m` = "x86_64" ]; then bash -c  'echo "deb https://debian.snips.ai/$(lsb_release -cs) stable main" > /etc/apt/sources.list.d/snips.list'; apt-key adv --keyserver pgp.mit.edu --recv-keys F727C778CCB0A455; fi

RUN apt-get update 
RUN apt-get install -y snips-platform-voice pulseaudio jq snips-watch snips-asr-model-en-500mb

# ADD NON FREE REPOS
# raspian includes them by default
RUN printf "deb http://deb.debian.org/debian jessie main contrib non-free" > /etc/apt/sources.list.d/non-free.list

RUN apt-get update

RUN apt-get -y install libttspico0 libttspico-utils libttspico-data libav-tools

# startup script from docker image using supervisord
COPY snips-entrypoint.sh /opt/snips/snips-entrypoint.sh
# default config file
COPY snips.toml /etc/snips.toml
# sample music assistant
COPY assistant /usr/share/snips/assistant
# not present after installation so copied from docker image 
# TODO allow for arm version
COPY snips-tts-x86 /usr/bin/snips-tts

COPY ./client.conf /etc/pulse/client.conf
COPY ./asound-pulse.conf /etc/asound.conf

ENTRYPOINT ["/opt/snips/snips-entrypoint.sh"]

CMD [""]


