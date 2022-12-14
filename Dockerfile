FROM jekyll/jekyll
LABEL maintainer "viktorxu"
ADD Gemfile /srv/jekyll/
RUN gem install bundler:1.16.2
RUN bundle update

CMD ["jekyll", "serve", "-w"]
ENTRYPOINT ["/usr/jekyll/bin/entrypoint"]
WORKDIR /srv/jekyll
VOLUME  /srv/jekyll
EXPOSE 35729
EXPOSE 4000
