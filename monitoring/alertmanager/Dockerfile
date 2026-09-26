FROM prom/alertmanager:v0.27.0
ARG ALERT_EMAIL_FROM
ARG ALERT_EMAIL_TO
COPY alertmanager.yml.tmpl /tmp/alertmanager.yml.tmpl
USER root

RUN sed -e "s|__ALERT_EMAIL_FROM__|${ALERT_EMAIL_FROM}|g" \
        -e "s|__ALERT_EMAIL_TO__|${ALERT_EMAIL_TO}|g" \
        /tmp/alertmanager.yml.tmpl > /etc/alertmanager/alertmanager.yml \
 && rm /tmp/alertmanager.yml.tmpl
USER nobody
