'use strict';
/* globals $, app, socket, define */

define('admin/plugins/sso-vkontakte', ['settings'], function(Settings) {

	var ACP = {};

	ACP.init = function() {
		Settings.load('sso-vkontakte', $('.sso-vkontakte-settings'));

		$('#save').on('click', function() {
			Settings.save('sso-vkontakte', $('.sso-vkontakte-settings'), function() {
				app.alert({
					type: 'success',
					alert_id: 'sso-vkontakte-saved',
					title: 'Settings Saved',
					message: 'Please rebuild and restart your NodeBB to apply these settings, or click on this alert to do so.',
					clickfn: function() {
						socket.emit('admin.reload');
					}
				});
			});
		});
	};

	return ACP;
});