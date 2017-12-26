FROM python:2.7-slim

ENV RASA_NLU_DOCKER="YES" \
    RASA_NLU_HOME=/app \
    RASA_NLU_PYTHON_PACKAGES=/usr/local/lib/python2.7/dist-packages

# Run updates, install basics and cleanup
# - build-essential: Compile specific dependencies
# - git-core: Checkout git repos
RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends build-essential git-core openssl libssl-dev libffi6 libffi-dev curl  \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN git clone https://github.com/RasaHQ/rasa_nlu.git
#WORKDIR ${RASA_NLU_HOME}/rasa_nlu

# use bash always
RUN rm /bin/sh && ln -s /bin/bash /bin/sh


#COPY . ${RASA_NLU_HOME}

## install java stuff

RUN echo "deb http://http.debian.net/debian jessie-backports main" > /etc/apt/sources.list.d/jessie-backports.list

RUN apt-get update && apt-get install -y --no-install-recommends \
		bzip2 \
		unzip \
		xz-utils \
	&& rm -rf /var/lib/apt/lists/*

# Default to UTF-8 file.encoding
ENV LANG C.UTF-8

# add a simple script that can auto-detect the appropriate JAVA_HOME value
# based on whether the JDK or only the JRE is installed
RUN { \
		echo '#!/bin/sh'; \
		echo 'set -e'; \
		echo; \
		echo 'dirname "$(dirname "$(readlink -f "$(which javac || which java)")")"'; \
	} > /usr/local/bin/docker-java-home \
	&& chmod +x /usr/local/bin/docker-java-home

# do some fancy footwork to create a JAVA_HOME that's cross-architecture-safe
RUN ln -svT "/usr/lib/jvm/java-8-openjdk-$(dpkg --print-architecture)" /docker-java-home
ENV JAVA_HOME /docker-java-home

ENV JAVA_VERSION 8u141
ENV JAVA_DEBIAN_VERSION 8u141-b15-1~deb9u1

# see https://bugs.debian.org/775775
# and https://github.com/docker-library/java/issues/19#issuecomment-70546872
ENV CA_CERTIFICATES_JAVA_VERSION 20170531+nmu1

RUN set -ex; \
	\
# deal with slim variants not having man page directories (which causes "update-alternatives" to fail)
	if [ ! -d /usr/share/man/man1 ]; then \
		mkdir -p /usr/share/man/man1; \
	fi; \
	\
	apt-get update; \
	apt-get install -y -t jessie-backports\
		openjdk-8-jdk \
		ca-certificates-java \
	; \
	rm -rf /var/lib/apt/lists/*; \
	\
# verify that "docker-java-home" returns what we expect
	[ "$(readlink -f "$JAVA_HOME")" = "$(docker-java-home)" ]; \
	\
# update-alternatives so that future installs of other OpenJDK versions don't change /usr/bin/java
	update-alternatives --get-selections | awk -v home="$(readlink -f "$JAVA_HOME")" 'index($3, home) == 1 { $2 = "manual"; print | "update-alternatives --set-selections" }'; \
# ... and verify that it actually worked for one of the alternatives we care about
	update-alternatives --query java | grep -q 'Status: manual'

# see CA_CERTIFICATES_JAVA_VERSION notes above
RUN /var/lib/dpkg/info/ca-certificates-java.postinst configure

## done java


RUN cd /rasa_nlu; pip install -r alt_requirements/requirements_full.txt

RUN cd /rasa_nlu;  pip install -e .

RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends  wget \
    && wget -P data/ https://s3-eu-west-1.amazonaws.com/mitie/total_word_feature_extractor.dat \
    && apt-get remove -y wget \
    && apt-get autoremove -y

RUN pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-1.2.0/en_core_web_sm-1.2.0.tar.gz --no-cache-dir > /dev/null \
    && python -m spacy link en_core_web_sm en \
    && pip install https://github.com/explosion/spacy-models/releases/download/de_core_news_md-1.0.0/de_core_news_md-1.0.0.tar.gz --no-cache-dir > /dev/null \
    && python -m spacy link de_core_news_md de

RUN mkdir ${RASA_NLU_HOME}
RUN cp /rasa_nlu/sample_configs/config_spacy_duckling.json ${RASA_NLU_HOME}/config.json

RUN pip install Flask

# RASA CORE
WORKDIR ${RASA_NLU_HOME}
RUN git clone https://github.com/RasaHQ/rasa_core.git
RUN cd rasa_core; pip install -r requirements.txt;  
RUN cd rasa_core; python setup.py install

RUN pip install paho-mqtt ws4py
COPY ./client.conf /etc/pulse/client.conf
COPY ./asound-pulse.conf /etc/asound.conf
COPY ./snips_services/ /opt/snips_services/
#RUN apt-get install pulseaudio  


EXPOSE 5000

ENTRYPOINT ['/opt/snips_services/rasa_server.py']
