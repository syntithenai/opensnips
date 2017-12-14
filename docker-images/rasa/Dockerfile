FROM syntithenai/snips_base
MAINTAINER Steve Ryan <stever@syntithenai.com>

# system dependancies
RUN  export DEBIAN_FRONTEND="noninteractive" ; apt-get  --allow-unauthenticated update && apt-get -f install && apt-get install  -fyq  --force-yes   libfreetype6-dev virtualenv python-pip python-sklearn python-dev libpng-dev  libfreetype6  nano apt-transport-https wget
#  && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*;

# USE (MORE EFFICIENT) ORACLE JDK FOR RASPI
#RUN if [ `uname -m` = "armv7l" ]; then  apt-get install -y oracle-java7-jdk; elif [ `uname -m` = "x86_64" ]; then apt-get install -y openjdk-7-jdk; fi
RUN apt-get install -y default-jdk

# Download and install Anaconda
# SWITCH ON ARCHITECTURE TO SELECT SOURCES
RUN if [ `uname -m` = "armv7l" ]; then  mkdir /opt/rasa  &&  export HOME=/opt/rasa/ && export ANACONDA_REPO='http://repo.continuum.io/miniconda/Miniconda-latest-Linux-armv7l.sh' && export ANACONDA_INSTALLER='Miniconda-latest-Linux-armv7l.sh' && wget -P /tmp/ $ANACONDA_REPO  && bash "/tmp/$ANACONDA_INSTALLER" -b -p $HOME/anaconda &&  export PATH="$HOME/anaconda/bin:$PATH" &&  echo 'export PATH="$HOME/anaconda/bin:$PATH"' >> ~/.bash_profile &&  echo 'export PATH="~/anaconda/bin:$PATH"' >> ~/.bashrc; elif [ `uname -m` = "x86_64" ]; then mkdir /opt/rasa  &&  export HOME=/opt/rasa/ && export ANACONDA_REPO='http://repo.continuum.io/miniconda/Miniconda2-4.3.30-Linux-x86_64.sh' && export ANACONDA_INSTALLER='Miniconda2-4.3.30-Linux-x86_64.sh' && wget -P /tmp/ $ANACONDA_REPO  && bash "/tmp/$ANACONDA_INSTALLER" -b -p $HOME/anaconda &&  export PATH="$HOME/anaconda/bin:$PATH" &&  echo 'export PATH="$HOME/anaconda/bin:$PATH"' >> ~/.bash_profile &&  echo 'export PATH="~/anaconda/bin:$PATH"' >> ~/.bashrc; fi


# https://repo.continuum.io/miniconda/Miniconda3-4.3.30-Linux-x86_64.sh
# http://repo.continuum.io/miniconda/Miniconda2-4.3.30-Linux-x86_64.sh
#https://repo.continuum.io/miniconda/Miniconda-3.16.0-Linux-x86_64.sh


# scikit sklearn
RUN /opt/rasa/anaconda/bin/conda install scikit-learn 
RUN /opt/rasa/anaconda/bin/pip install -U sklearn-crfsuite

RUN  ls /tmp

# install rasa_nlu and requirementS
RUN /opt/rasa/anaconda/bin/pip install setuptools ; echo "done" 
RUN /opt/rasa/anaconda/bin/pip install -U spacy ; echo "done" 
RUN /opt/rasa/anaconda/bin/python -m spacy download en ; echo "done" 
RUN /opt/rasa/anaconda/bin/pip install -U scikit-learn scipy sklearn-crfsuite  paho-mqtt ; echo "done" 
RUN apt-get install -y git
RUN cd /opt/rasa && git clone https://github.com/RasaHQ/rasa_nlu.git && cd rasa_nlu && /opt/rasa/anaconda/bin/pip install -r requirements.txt;  echo done;
RUN cd /opt/rasa/rasa_nlu && /opt/rasa/anaconda/bin/python setup.py install ; echo "done" 

RUN /opt/rasa/anaconda/bin/pip install -U docker-compose ; echo "done" 
RUN /opt/rasa/anaconda/bin/pip install -U setuptools ; echo "done" 

# and again to force ??
RUN /opt/rasa/anaconda/bin/pip install -U spacy ; echo "done" 
RUN /opt/rasa/anaconda/bin/python -m spacy download en ; echo "done" 

RUN /opt/rasa/anaconda/bin/pip install -U Flask ; echo "done" 
RUN /opt/rasa/anaconda/bin/pip install duckling

# rasa core
RUN /opt/rasa/anaconda/bin/pip install pypandoc
RUN  apt-get install -y  pandoc
RUN cd /opt/rasa && git clone https://github.com/RasaHQ/rasa_core.git 
COPY rasa_core_requirements.txt /opt/rasa/rasa_core/requirements.txt
RUN cd /opt/rasa/rasa_core && /opt/rasa/anaconda/bin/pip install -r requirements.txt 
RUN cd /opt/rasa/rasa_core && /opt/rasa/anaconda/bin/pip install -e .

RUN /opt/rasa/anaconda/bin/pip install paho-mqtt future typing boto3

# ADD NON FREE REPOS
# raspian includes them by default
RUN printf "deb http://deb.debian.org/debian jessie main contrib non-free" > /etc/apt/sources.list.d/non-free.list

RUN apt-get update

RUN apt-get -y install libttspico0 libttspico-utils libttspico-data libav-tools

RUN apt-get -y install pulseaudio sox libsox-fmt-all mosquitto-clients portaudio19-dev  python-pyaudio
RUN /opt/rasa/anaconda/bin/pip install pyaudio

RUN cd /opt; git clone https://github.com/rabitt/pysox.git; cd pysox ; /opt/rasa/anaconda/bin/python setup.py install

#curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.python.sh | bash
#RUN pip install deepspeech
#wget -O - https://github.com/mozilla/DeepSpeech/releases/download/v0.1.0/deepspeech-0.1.0-models.tar.gz | tar xvfz -

# hacked entrypoint script and ENV VAR to trigger rasa
#COPY ./snips-entrypoint.sh /opt/snips/snips-entrypoint.sh

COPY ./snips_services/ /opt/snips_services/
#COPY ./snips_rasa_core/ /opt/snips_rasa_core/
#COPY ./rasa_musicplayer/ /opt/rasa_musicplayer/


RUN DEBIAN_FRONTEND="noninteractive" ; apt-get  --allow-unauthenticated update &&  apt-get install -y swig3.0 python-pyaudio python3-pyaudio sox python-pip

RUN apt-get install -y python-dev 
COPY ./rpi-arm-raspbian-8.0-1.2.0.tar.bz2 /tmp/rpi-arm-raspbian-8.0-1.2.0.tar.bz2
COPY ./ubuntu1404-x86_64-1.2.0.tar.bz2 /tmp/ubuntu1404-x86_64-1.2.0.tar.bz2

RUN pip install pyaudio; 
RUN apt-get install -y libatlas-base-dev pulseaudio
RUN pip install paho-mqtt
RUN mkdir -p /opt/snowboy && mkdir /tmp/snowboy && cd /tmp/snowboy && if [ `uname -m` = "armv7l" ]; then  bunzip2 /tmp/rpi-arm-raspbian-8.0-1.2.0.tar.bz2 && tar xf /tmp/rpi-arm-raspbian-8.0-1.2.0.tar; cd rpi-arm-raspbian-8.0-1.2.0; cp -r * /opt/snowboy ; elif [ `uname -m` = "x86_64" ]; then bunzip2 /tmp/ubuntu1404-x86_64-1.2.0.tar.bz2 && tar xf /tmp/ubuntu1404-x86_64-1.2.0.tar;  cd ubuntu1404-x86_64-1.2.0; cp -a * /opt/snowboy ;fi; 

#COPY ./snips_hotword_snowboy/* /opt/snips_hotword_snowboy/
#COPY ./snips_hotword_snowboy/resources/* /opt/snips_hotword_snowboy/resources/

RUN /opt/rasa/anaconda/bin/pip install ws4py

COPY ./client.conf /etc/pulse/client.conf
COPY ./asound-pulse.conf /etc/asound.conf

ENTRYPOINT ['/opt/snips_rasa_server/start.sh']
#CMD ["/opt/snips/snips-entrypoint.sh"]
