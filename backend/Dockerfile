FROM node:22

RUN apt-get update && \
    apt-get install -y git bash && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

CMD ["tail", "-f", "/dev/null"]