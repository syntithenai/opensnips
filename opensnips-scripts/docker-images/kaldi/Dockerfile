FROM jcsilva/docker-kaldi-gstreamer-server:latest
#FROM syntithenai/snips_base
RUN apt-get update && apt-get install -y wget
RUN cd /tmp/; wget --no-check-certificate https://phon.ioc.ee/~tanela/tedlium_nnet_ms_sp_online.tgz ; mkdir -p /opt/models ; cd /opt/models; tar xzf /tmp/tedlium_nnet_ms_sp_online.tgz; rm /tmp/tedlium_nnet_ms_sp_online.tgz

RUN cd /opt; mkdir test; mv models test

COPY nnet2.yaml /opt/test/models/asrmodel.yaml
COPY delayedstart.sh /opt/delayedstart.sh
RUN chmod 777 /opt/delayedstart.sh

COPY start.sh stop.sh /opt/

RUN apt-get install -y pulseaudio

RUN chmod +x /opt/start.sh && \
    chmod +x /opt/stop.sh 
    

#ENTRYPOINT ['/opt/start.sh -y /opt/models/test/asrmodel.yaml']
ENTRYPOINT ['/opt/delayedstart.sh']
