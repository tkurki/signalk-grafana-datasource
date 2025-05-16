# Grafana Datasource for Signal K

This is a Grafana datasource for using [Signal K](https://signalk.org/) data over
- streaming WebSocket connection for realtime data
- the History HTTP API

See [the plugin in Grafana Plugins directory](https://grafana.com/grafana/plugins/tkurki-signalk-datasource/) for more details.

For a quick try you can clone or download this repository and start Signal K Server, Influx DB and Grafana preconfigured and connected with

```
docker compose -f docker-compose-published.yml up
```

Then you can access Grafana at [localhost:3000](http://localhost:3000).