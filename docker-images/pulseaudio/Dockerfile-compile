FROM alpine:3.6

#LABEL maintainer="KenjiTakahashi <kenji.sx>"
LABEL maintainer="Steve Ryan <stever@syntithenai.com>"

RUN apk add --no-cache \
    curl \
    file \
    make \
    gcc \
    libc-dev \
    m4 \
    libtool \
    libcap-dev \
    libsndfile-dev \
    speexdsp-dev \
    alsa-lib-dev

COPY *.patch /home/

RUN curl -Lo/home/pa.tar.xz https://freedesktop.org/software/pulseaudio/releases/pulseaudio-10.0.tar.xz && \
    tar xvf /home/pa.tar.xz -C /home && \
    cd /home/pulseaudio-10.0 && \
    patch -Np1 < ../0001-padsp-Make-it-compile-on-musl.patch && \
    ./configure \
        --prefix=/usr/local \
        --sysconfdir=/usr/local/etc \
        --mandir=/usr/local/share/man \
        --localstatedir=/var \
        --disable-udev \
        --disable-hal-compat \
        --disable-nls \
        --disable-oss-output \
        --disable-coreaudio-output \
        --disable-esound \
        --disable-solaris \
        --disable-gconf \
        --disable-avahi \
        --disable-manpages \
        --disable-x11 \
        --disable-gtk3 \
        --disable-legacy-database-entry-format \
    && \
    make && \
    make -j1 install && \
    rm -rf /home/pulseaudio-10.0 /home/*.patch /home/*.xz

# auth-anonymous=1
RUN sed -i 's,load-module module-native-protocol-unix,& socket=/tmp/pulse/socket auth-group=root,g' /usr/local/etc/pulse/default.pa
RUN sed -i 's,; default-server =,default-server = unix:/tmp/pulse/socket,g' /usr/local/etc/pulse/client.conf
RUN sed -i 's,; autospawn = yes,autospawn = no,g' /usr/local/etc/pulse/client.conf
RUN sed -i 's,; exit-idle-time = 20,exit-idle-time = -1,g' /usr/local/etc/pulse/daemon.conf


#FROM alpine:3.6

#COPY --from=0 /usr/local/ /usr/local/

# ---------------


RUN apk add --no-cache \
    libltdl \
    libcap \
    libsndfile \
    speexdsp \
    alsa-lib

RUN addgroup -S -g 29 pulse && \
    adduser -S -G pulse pulse && \
    addgroup pulse audio && \
    mkdir /tmp/pulse && \
    chown -R pulse:pulse /home/pulse /tmp/pulse && chmod -R 777 /home/pulse

COPY ./start.sh /tmp/start.sh 
RUN chmod 777 /tmp/start.sh

#COPY ./pulse-daemon.conf /usr/local/etc/pulse/daemon.conf 


USER pulse

#VOLUME ["/tmp/pulse", "/usr/local/etc/pulse"]
#RUN touch /tmp/pulse/socket; chmod 777 /tmp/pulse/socket
#COPY ./start.sh start.sh
ENTRYPOINT ["/tmp/start.sh"]
CMD ["--log-target=stderr"]
