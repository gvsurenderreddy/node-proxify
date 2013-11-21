url = require 'url'
net = require 'net'
http = require 'http'
https = require 'https'
winston = require 'winston'

# ---

exports.logger = new winston.Logger {
	transports: [
		new winston.transports.Console
	]
}

# ---

exports.create_bare_proxy = (srv_imp=http, config=null) ->
	proxy = srv_imp.createServer config
	
	# +++
	
	proxy.on 'request', (req, res) ->
		exports.logger.info "received request for #{req.url}"
		
		# ^^^
		
		proxy.emit 'intercept-request', req
		
		# ^^^
		
		options = url.parse req.url
		options.headers = req.headers
		options.method = req.method
		options.agent = false
		
		# ^^^
		
		if config
			options.protocol = config.overwrite_protocol if config.overwrite_protocol?
			options.hostname = config.overwrite_hostname if config.overwrite_hostname?
			options.port = config.overwrite_port if config.overwrite_port?
			
		# ^^^
		
		options.protocol ?= 'http:'
		
		# ~~~
		
		req.url = url.format options
		
		# ^^^
		
		clt_imp = switch
			when options.protocol == 'http:' then http
			when options.protocol == 'https:' then https
			else http
			
		# ^^^
		
		connector = clt_imp.request options
		
		# ^^^
		
		connector.on 'response', (server_res) ->
			exports.logger.info "received response for #{req.url}"
			
			# ^^^
			
			proxy.emit 'intercept-response', server_res
			
			# ~~~
			
			res.writeHead server_res.statusCode, server_res.headers
			
			# ~~~
			
			server_res.pipe res, {end: true}
			
			server_res.on 'end', () ->
				# NOTE: probably not correct but without this connection will never end
				server_res.socket.end()
				#
				
		# ^^^
		
		connector.on 'error', (error) ->
			exports.logger.error 'connector error', error
			
		# +++
		
		req.pipe connector, {end: true}
		
	# +++
	
	proxy.on 'error', (error) ->
		exports.logger.error 'proxy error', error
		
	# +++
	
	return proxy
	
# ---

exports.pem_manager = new class
	constructor: () ->
		@default_key = """
		-----BEGIN RSA PRIVATE KEY-----
		MIICXAIBAAKBgQCxpU2DKCV61/Nm8iy3TBVzyMejZ+Rzj3mVRPM647US1bE/bCBn
		zP4w12IPsbo1D5WKzBeDTegffAi1U3wHEnSD8l1bCWiLuBCnD5AuR78NBCjOuL/S
		U0vV0bjKNW0+nWhi/YSsIRbdkTaTXuYHZBfI67HwbkpI0JjgNGCWBm530wIDAQAB
		AoGAFVRwyye94FMfoaPAZL3Y8Y8REXi/AHUgtyCRR+fhbQKFhsT32x7NApZJ6vJ/
		FjHp1cGNrTFkhqtA7Gy6vqqjnKT9ySbTLwZboMK/yVP8JBT0rqMby9LHp+whhmvz
		wCMSs7zOQeUh0cJGWUVyVB3ezF4qhvy15rOUN2UADkgMzykCQQDWvQVs9fX+wOfp
		D09IIFBrchlIoQN32jjSIkgzCYrJSJK6oyEN2RujLG1h5ro8Y/WSV4QPE3UShZ8h
		orzIwDtPAkEA08exwad0loNGT8UGTjQwmuas2yvjboI28z5TgSn0N3OwZSux8Ghx
		qyYb2D+RVlMZGbCpn5FJhyFPJx/9m+zKPQJALWkNk6wz2CqtIDD3oBYNS5t2U1CR
		bi/8ohtTz08uRUCOnt9OZyJJYOlNPE3RhmHRFaBiMdn4gPE25KMIbx+PqwJBAJ7U
		UrU5IJBNTes/ibYXICjcPeF2LfDQSePt53SkgVshMbb+qUnzGuTQBOwO6LJESjvh
		KaXZsbpdud5O+MX7NcUCQAswPd8s/+ulwRUBbChA+2+uZNHSBMpmEZxvLTsWTHRX
		p5tMmK/oAKqmtSTuL8geqXy7++JS99jEpeymJgtHAyk=
		-----END RSA PRIVATE KEY-----
		"""
		
		# +++
		
		@default_cert = """
		-----BEGIN CERTIFICATE-----
		MIICATCCAWoCCQCw82O2d2aB/jANBgkqhkiG9w0BAQUFADBFMQswCQYDVQQGEwJB
		VTETMBEGA1UECBMKU29tZS1TdGF0ZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0
		cyBQdHkgTHRkMB4XDTEzMTEyMDE3NDIyM1oXDTEzMTIyMDE3NDIyM1owRTELMAkG
		A1UEBhMCQVUxEzARBgNVBAgTClNvbWUtU3RhdGUxITAfBgNVBAoTGEludGVybmV0
		IFdpZGdpdHMgUHR5IEx0ZDCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEAsaVN
		gygletfzZvIst0wVc8jHo2fkc495lUTzOuO1EtWxP2wgZ8z+MNdiD7G6NQ+ViswX
		g03oH3wItVN8BxJ0g/JdWwloi7gQpw+QLke/DQQozri/0lNL1dG4yjVtPp1oYv2E
		rCEW3ZE2k17mB2QXyOux8G5KSNCY4DRglgZud9MCAwEAATANBgkqhkiG9w0BAQUF
		AAOBgQBoZUgGUsjpuXvnYwvG/P7xHcVYb6klun8KWJd2G4tpZrkXMUphgmXyCe97
		15sd0h0b0gnd6T4Wvu0cq+Pc2+iWSpobHwfjtSqeYVFEw0MwvqLaK68U9vMOcKki
		7rKw7Xzg9hbwgyASUAcT2S2SmCRg4zNIfpWCFChMfQa5OLsV0Q==
		-----END CERTIFICATE-----
		"""
		
		# +++
		
		@pems = {}
		
	get: (hostname, port, callback) ->
		netloc = "#{hostname}:#{port}"
		
		# +++
		
		return callback null, @pems[netloc] if @pems[netloc]?
		
		# +++
		
		pem = {
			key: @default_key
			cert: @default_cert
		}
		
		# +++
		
		@pems[netloc] = pem
		
		# +++
		
		return callback null, pem
		
# ---

exports.connection_manager = new class
	constructor: () ->
		@connections = {}
		@port = 1337
		
	get: (hostname, port, callback) ->
		netloc = "#{hostname}:#{port}"
		
		# +++
		
		return callback null, @connections[netloc], false if @connections[netloc]?
		
		# +++
		
		exports.pem_manager.get hostname, port, (err, pem) =>
			return err if err
			
			# ^^^
			
			connection = {
				server_port: ++@port
				server: exports.create_bare_proxy https, {
					overwrite_protocol: 'https:'
					overwrite_hostname: hostname
					overwrite_port: port
					key: pem.key
					cert: pem.cert
				}
			}
			
			# ^^^
			
			@connections[netloc] = connection
			
			# ^^^
			
			connection.server.on 'error', (error) =>
				delete @connections[netloc]
				
				# ~~~
				
				@get hostname, port, callback if error.code == 'EADDRINUSE'
				
			# ^^^
			
			connection.server.listen connection.server_port, () ->
				callback null, connection, true
				
# ---

exports.create_proxy = (config={}) ->
	proxy = exports.create_bare_proxy http, null
	
	# +++
	
	proxy.on 'connect', (req, clt_socket, head) ->
		options = url.parse "https://#{req.url}"
		
		# ^^^
		
		exports.connection_manager.get options.hostname, options.port, (err, connection, is_new) ->
			clt_socket.destroy() if err
			
			# ~~~
			
			if is_new
				connection.server.emit = do (emit=connection.server.emit) -> (type, args...) ->
					emit.call @, type, args...
					proxy.emit "sub-#{type}", args...
					
			# ~~~
			
			srv_socket = net.connect connection.server_port, 'localhost', () ->
				clt_socket.write "HTTP/1.1 200 Connection Established\r\nProxy-agent: #{config.agent ? 'Proxify'}\r\n\r\n"
				srv_socket.write head
				
				# ~~~
				
				clt_socket.pipe srv_socket
				srv_socket.pipe clt_socket
				
			# ~~~
			
			clt_socket.on 'error', () -> srv_socket.destroy()
			srv_socket.on 'error', () -> clt_socket.destroy()
			
	# +++
	
	return proxy
	
