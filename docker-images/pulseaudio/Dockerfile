FROM syntithenai/snips
MAINTAINER Steve Ryan <stever@syntithenai.com>

RUN export DEBIAN_FRONTEND="noninteractive" ; apt-get  --allow-unauthenticated update &&  apt-get install  -fyq  --force-yes  pulseaudio

RUN adduser snips && adduser snips pulse
    #//mkdir /tmp/pulse && \
    #//chown -R snips:snips /home/snips /tmp/pulse && chmod -R 777 /home/pulse

#RUN mkdir /var/run/pulse; chown -R pulse.pulse /var/run/pulse; chmod -R 777 /var/run/pulse

USER snips

ENTRYPOINT pulseaudio
