FROM jcsilva/docker-kaldi-gstreamer-server:latest
RUN cd /tmp/; wget --no-check-certificate https://phon.ioc.ee/~tanela/tedlium_nnet_ms_sp_online.tgz ; 
RUN mkdir -p /opt/models ; cd /opt/models; tar xzf /tmp/tedlium_nnet_ms_sp_online.tgz; rm /tmp/tedlium_nnet_ms_sp_online.tgz
COPY nnet2.yaml /opt/models/nnet2.yaml
# COPY ./model/ /opt/models
COPY delayedstart.sh /opt/delayedstart.sh
RUN chmod 777 /opt/delayedstart.sh
#ENTRYPOINT ['/opt/start.sh -y /opt/models/nnet2.yaml']
ENTRYPOINT ['/opt/delayedstart.sh']
