/* globals winston */

(function(module) {
	"use strict";

	var User = require.main.require('./src/user'),
		meta = require.main.require('./src/meta'),
		db = require.main.require('./src/database'),
		passport = require.main.require('passport'),
		passportVK = require('passport-vkontakte').Strategy,
		nconf = require.main.require('nconf'),
		async = require.main.require('async');

	var authenticationController = require.main.require('./src/controllers/authentication');

	var constants = Object.freeze({
		'name': "Vkontakte",
		'admin': {
			'icon': 'fa-vk',
			'route': '/plugins/sso-vkontakte'
		}
	});

	var Vkontakte = {
		settings: undefined
	};

	Vkontakte.init = function(data, callback) {
		var hostHelpers = require.main.require('./src/routes/helpers');

		function render(_, res) {
			res.render('admin/plugins/sso-vkontakte', {});
		}

		data.router.get('/admin/plugins/sso-vkontakte', data.middleware.admin.buildHeader, render);
		data.router.get('/api/admin/plugins/sso-vkontakte', render);

		hostHelpers.setupPageRoute(data.router, '/deauth/vkontakte', data.middleware, [data.middleware.requireUser], function (_, res) {
			res.render('plugins/sso-vkontakte/deauth', {
				service: "Vkontakte",
			});
		});
		data.router.post('/deauth/vkontakte', [data.middleware.requireUser, data.middleware.applyCSRF], function (req, res, next) {
			Vkontakte.deleteUserData({ uid: req.user.uid }, function (err) {
				if (err) {
					return next(err);
				}

				res.redirect(nconf.get('relative_path') + '/me/edit');
			});
		});

		meta.settings.get('sso-vkontakte', function(_, settings) {
			Vkontakte.settings = settings;
			callback();
		});
	};

	Vkontakte.getAssociation = function (data, callback) {
		User.getUserField(data.uid, 'vkontakteid', function (err, vkontakteid) {
			if (err) {
				return callback(err, data);
			}

			if (vkontakteid) {
				data.associations.push({
					associated: true,
					url: 'https://vk.com/id' + vkontakteid,
					deauthUrl: nconf.get('url') + '/deauth/vkontakte',
					name: constants.name,
					icon: constants.admin.icon
				});
			} else {
				data.associations.push({
					associated: false,
					url: nconf.get('url') + '/auth/vkontakte',
					name: constants.name,
					icon: constants.admin.icon
				});
			}

			callback(null, data);
		})
	};

	Vkontakte.getStrategy = function(strategies, callback) {
		if (Vkontakte.settings['id'] && Vkontakte.settings['secret']) {
			passport.use(new passportVK({
				clientID: Vkontakte.settings['id'],
				clientSecret: Vkontakte.settings['secret'],
				callbackURL: nconf.get('url') + '/auth/vkontakte/callback',
				passReqToCallback: true,
				profileFields: ['id', 'emails', 'name', 'displayName']
			}, function(req, _, __, ___, profile, done) {

				if (hasOwnProperty(req, 'user') && hasOwnProperty(req.user, 'uid') && req.user.uid > 0) {
					User.setUserField(req.user.uid, 'vkontakteid', profile.id);
					db.setObjectField('vkontakteid:uid', profile.id, req.user.uid);

					return authenticationController.onSuccessfulLogin(req, req.user.uid, function (err) {
						done(err, !err ? req.user : null);
					});
				}

				var email = hasOwnProperty(profile, 'emails')
					? profile.emails[0].value
					: (profile.username ? profile.username : profile.id) + '@users.noreply.vkontakte.com';

				Vkontakte.login(profile.id, profile.displayName, email, profile.photos[0].value, function(err, user) {
					if (err) {
						return done(err);
					}

					authenticationController.onSuccessfulLogin(req, user.uid, function (err) {
						done(err, !err ? user : null);
					});
				});
			}));

			strategies.push({
				name: 'vkontakte',
				url: '/auth/vkontakte',
				callbackURL: '/auth/vkontakte/callback',
				icon: 'vk fa-vk',
				scope: 'email'
			});
		}

		callback(null, strategies);
	};

	Vkontakte.login = function(vkontakteID, displayName, email, picture, callback) {
		Vkontakte.getUidByVkontakteId(vkontakteID, function(err, uid) {
			if (err) {
				return callback(err);
			}

			if (uid !== null) {
				// Existing User
				callback(null, {
					uid: uid
				});
			} else {
				// New User
				var success = function(uid) {
					var autoConfirm = Vkontakte.settings && Vkontakte.settings.autoconfirm === "on" ? 1: 0;
					User.setUserField(uid, 'email:confirmed', autoConfirm);
					if (autoConfirm) {
						db.sortedSetRemove('users:notvalidated', uid);
					}

					User.setUserField(uid, 'vkontakteid', vkontakteID);
					db.setObjectField('vkontakteid:uid', vkontakteID, uid);
					
					if (picture) {
						User.setUserField(uid, 'uploadedpicture', picture);
						User.setUserField(uid, 'picture', picture);
					}
					
					callback(null, {
						uid: uid
					});
				};

				User.getUidByEmail(email, function(err, uid) {
					if(err) {
						return callback(err);
					}
					
					if (!uid) {
						User.create({username: displayName, email: email}, function(err, uid) {
							if(err) {
								return callback(err);
							}
							
							success(uid);
						});
					} else {
						success(uid); // Existing account -- merge
					}
				});
			}
		});
	};

	Vkontakte.getUidByVkontakteId = function(vkontakteID, callback) {
		db.getObjectField('vkontakteid:uid', vkontakteID, function(err, uid) {
			if (err) {
				return callback(err);
			}
			callback(null, uid);
		});
	};

	Vkontakte.addMenuItem = function(custom_header, callback) {
		custom_header.authentication.push({
			"route": constants.admin.route,
			"icon": constants.admin.icon,
			"name": constants.name
		});

		callback(null, custom_header);
	};
	
	Vkontakte.deleteUserData = function(user, callback) {

		var uid = user.uid;

		async.waterfall([
			async.apply(User.getUserField, uid, 'vkontakteid'),
			function(oAuthIdToDelete, next) {
				db.deleteObjectField('vkontakteid:uid', oAuthIdToDelete, next);
			},
			function (next) {
				db.deleteObjectField('user:' + uid, 'vkontakteid', next);
			}
		], function(err) {
			if (err) {
				winston.error('[sso-vkontakte] Could not remove OAuthId data for uid ' + uid + '. Error: ' + err);
				return callback(err);
			}
			callback(null, uid);
		});
	};

	function hasOwnProperty(obj, prop) {
		return Object.prototype.hasOwnProperty.call(obj, prop);
	}

	module.exports = Vkontakte;
}(module));
