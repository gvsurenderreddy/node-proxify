(function() {
  var http, https, net, url,
    __slice = [].slice;

  url = require('url');

  net = require('net');

  http = require('http');

  https = require('https');

  exports.create_bare_proxy = function(srv_imp, config) {
    var proxy;
    if (srv_imp == null) {
      srv_imp = http;
    }
    if (config == null) {
      config = null;
    }
    proxy = srv_imp.createServer(config);
    proxy.on('request', function(req, res) {
      var clt_imp, connector, options, port;
      options = url.parse(req.url);
      if (config) {
        if (config.overwrite_protocol != null) {
          options.protocol = config.overwrite_protocol;
        }
        if (config.overwrite_hostname != null) {
          options.hostname = config.overwrite_hostname;
        }
        if (config.overwrite_port != null) {
          options.port = config.overwrite_port;
        }
      }
      if (options.protocol == null) {
        options.protocol = 'http:';
      }
      req.url = url.format(options);
      port = {};
      port.req = req;
      proxy.emit('intercept-request', port);
      req = port.req;
      options.headers = req.headers;
      options.method = req.method;
      options.agent = false;
      clt_imp = (function() {
        switch (false) {
          case options.protocol !== 'http:':
            return http;
          case options.protocol !== 'https:':
            return https;
          default:
            return http;
        }
      })();
      connector = clt_imp.request(options);
      connector.on('response', function(server_res) {
        port.res = server_res;
        proxy.emit('intercept-response', port);
        server_res = port.res;
        res.writeHead(server_res.statusCode, server_res.headers);
        server_res.pipe(res, {
          end: true
        });
        return server_res.on('end', function() {
          return server_res.socket.end();
        });
      });
      connector.on('error', function(error) {
        res.writeHead(500, {
          'Content-Type': 'text/plain'
        });
        return res.end('Something blew up!');
      });
      return req.pipe(connector, {
        end: true
      });
    });
    return proxy;
  };

  exports.security_manager = new ((function() {
    function _Class() {
      this.default_key = "-----BEGIN RSA PRIVATE KEY-----\nMIICXAIBAAKBgQCxpU2DKCV61/Nm8iy3TBVzyMejZ+Rzj3mVRPM647US1bE/bCBn\nzP4w12IPsbo1D5WKzBeDTegffAi1U3wHEnSD8l1bCWiLuBCnD5AuR78NBCjOuL/S\nU0vV0bjKNW0+nWhi/YSsIRbdkTaTXuYHZBfI67HwbkpI0JjgNGCWBm530wIDAQAB\nAoGAFVRwyye94FMfoaPAZL3Y8Y8REXi/AHUgtyCRR+fhbQKFhsT32x7NApZJ6vJ/\nFjHp1cGNrTFkhqtA7Gy6vqqjnKT9ySbTLwZboMK/yVP8JBT0rqMby9LHp+whhmvz\nwCMSs7zOQeUh0cJGWUVyVB3ezF4qhvy15rOUN2UADkgMzykCQQDWvQVs9fX+wOfp\nD09IIFBrchlIoQN32jjSIkgzCYrJSJK6oyEN2RujLG1h5ro8Y/WSV4QPE3UShZ8h\norzIwDtPAkEA08exwad0loNGT8UGTjQwmuas2yvjboI28z5TgSn0N3OwZSux8Ghx\nqyYb2D+RVlMZGbCpn5FJhyFPJx/9m+zKPQJALWkNk6wz2CqtIDD3oBYNS5t2U1CR\nbi/8ohtTz08uRUCOnt9OZyJJYOlNPE3RhmHRFaBiMdn4gPE25KMIbx+PqwJBAJ7U\nUrU5IJBNTes/ibYXICjcPeF2LfDQSePt53SkgVshMbb+qUnzGuTQBOwO6LJESjvh\nKaXZsbpdud5O+MX7NcUCQAswPd8s/+ulwRUBbChA+2+uZNHSBMpmEZxvLTsWTHRX\np5tMmK/oAKqmtSTuL8geqXy7++JS99jEpeymJgtHAyk=\n-----END RSA PRIVATE KEY-----";
      this.default_cert = "-----BEGIN CERTIFICATE-----\nMIICATCCAWoCCQCw82O2d2aB/jANBgkqhkiG9w0BAQUFADBFMQswCQYDVQQGEwJB\nVTETMBEGA1UECBMKU29tZS1TdGF0ZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0\ncyBQdHkgTHRkMB4XDTEzMTEyMDE3NDIyM1oXDTEzMTIyMDE3NDIyM1owRTELMAkG\nA1UEBhMCQVUxEzARBgNVBAgTClNvbWUtU3RhdGUxITAfBgNVBAoTGEludGVybmV0\nIFdpZGdpdHMgUHR5IEx0ZDCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEAsaVN\ngygletfzZvIst0wVc8jHo2fkc495lUTzOuO1EtWxP2wgZ8z+MNdiD7G6NQ+ViswX\ng03oH3wItVN8BxJ0g/JdWwloi7gQpw+QLke/DQQozri/0lNL1dG4yjVtPp1oYv2E\nrCEW3ZE2k17mB2QXyOux8G5KSNCY4DRglgZud9MCAwEAATANBgkqhkiG9w0BAQUF\nAAOBgQBoZUgGUsjpuXvnYwvG/P7xHcVYb6klun8KWJd2G4tpZrkXMUphgmXyCe97\n15sd0h0b0gnd6T4Wvu0cq+Pc2+iWSpobHwfjtSqeYVFEw0MwvqLaK68U9vMOcKki\n7rKw7Xzg9hbwgyASUAcT2S2SmCRg4zNIfpWCFChMfQa5OLsV0Q==\n-----END CERTIFICATE-----";
    }

    _Class.prototype.get = function(hostname, port, callback) {
      var security;
      security = {
        key: this.default_key,
        cert: this.default_cert
      };
      return callback(null, security);
    };

    return _Class;

  })());

  exports.connection_manager = new ((function() {
    function _Class() {
      this.connections = {};
      this.queue = [];
      this.port = 1337;
    }

    _Class.prototype.get = function(hostname, port, callback) {
      var netloc;
      netloc = "" + hostname + ":" + port;
      if (this.connections[netloc] != null) {
        return callback(null, this.connections[netloc], false);
      }
      this.queue.push({
        hostname: hostname,
        port: port,
        callback: callback,
        netloc: netloc
      });
      return this.ignite();
    };

    _Class.prototype.ignite = function() {
      var next,
        _this = this;
      next = this.queue.pop();
      if (!next) {
        return;
      }
      return exports.security_manager.get(next.hostname, next.port, function(err, security) {
        var connection;
        if (err) {
          next.callback(err);
          return _this.ignite();
        }
        connection = {
          server_port: ++_this.port,
          server: exports.create_bare_proxy(https, {
            overwrite_protocol: 'https:',
            overwrite_hostname: next.hostname,
            overwrite_port: next.port,
            key: security.key,
            cert: security.cert
          })
        };
        connection.server.on('error', function(error) {
          if (error.code === 'EADDRINUSE') {
            return _this.get(next.hostname, next.port, next.callback);
          }
        });
        return connection.server.listen(connection.server_port, function() {
          _this.connections[next.netloc] = connection;
          next.callback(null, connection, true);
          return _this.ignite();
        });
      });
    };

    return _Class;

  })());

  exports.create_mitm_proxy = function(config) {
    var proxy;
    if (config == null) {
      config = {};
    }
    proxy = exports.create_bare_proxy(http, null);
    proxy.on('connect', function(req, clt_socket, head) {
      var options;
      options = url.parse("https://" + req.url);
      return exports.connection_manager.get(options.hostname, options.port, function(err, connection, is_new) {
        var srv_socket;
        if (err) {
          clt_socket.destroy();
        }
        if (is_new) {
          connection.server.emit = (function(emit) {
            return function() {
              var args, type;
              type = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
              emit.call.apply(emit, [this, type].concat(__slice.call(args)));
              return proxy.emit.apply(proxy, ["sub-" + type].concat(__slice.call(args)));
            };
          })(connection.server.emit);
        }
        srv_socket = net.connect(connection.server_port, 'localhost', function() {
          var _ref;
          clt_socket.write("HTTP/1.1 200 Connection Established\r\nProxy-agent: " + ((_ref = config.agent) != null ? _ref : 'Proxify') + "\r\n\r\n");
          srv_socket.write(head);
          clt_socket.pipe(srv_socket);
          return srv_socket.pipe(clt_socket);
        });
        clt_socket.on('error', function() {
          return srv_socket.destroy();
        });
        return srv_socket.on('error', function() {
          return clt_socket.destroy();
        });
      });
    });
    return proxy;
  };

}).call(this);
