function uploader(argument) {

	request.put(url, opt, function(err, response, body) {
		// debug(response.headers);
		// debug(body);

		if (err) {
			debug(err);
			deferred.reject(err);
			return;
		}
		debug('status: ' + response.headers.status);

		if (response.statusCode == 200 && body.code) {
			task.uploadWidget = response.headers.status;
			deferred.resolve(task);
			debug('upload success');
			return;
		}

		deferred.reject('upload failed');
	});

}