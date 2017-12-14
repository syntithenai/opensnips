FROM jcsilva/docker-kaldi-gstreamer-server:latest
COPY ./model/ /opt/models
COPY delayedstart.sh /opt/delayedstart.sh
RUN chmod 777 /opt/delayedstart.sh
#ENTRYPOINT ['/opt/start.sh -y /opt/models/nnet2.yaml']
ENTRYPOINT ['/opt/delayedstart.sh']
