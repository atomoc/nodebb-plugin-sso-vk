<div class="row">
	<div class="col-xs-12">
		<div class="panel panel-default">
			<div class="panel-heading">Vkontakte Social Authentication</div>
			<div class="panel-body">
				<form role="form" class="sso-vkontakte-settings">
					<p>
						Register a new <strong>Vkontakte Application</strong> via 
						<a href="https://vk.com/dev">Application Development</a>
					</p>
					<div class="form-group">
						<label for="Client ID">Client ID</label>
						<input type="text" id="id" name="id" title="Client ID" class="form-control" placeholder="Client ID"><br />
					</div>
					<div class="form-group">
						<label for="Client Secret">Client Secret</label>
						<input type="text" id="secret" name="secret" title="Client Secret" class="form-control" placeholder="Client Secret">
					</div>
					<p class="help-block">
						The appropriate "callback URL" is your NodeBB's URL with `/auth/vkontakte/callback` appended to it.
					</p>
					<div class="checkbox">
						<label for="showSiteTitle" class="mdl-switch mdl-js-switch mdl-js-ripple-effect">
							<input type="checkbox" class="mdl-switch__input" id="showSiteTitle" name="autoconfirm" />
							<span class="mdl-switch__label">Skip email verification for people who register using SSO?</span>
						</label>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>

<button id="save" class="floating-button mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored">
	<i class="material-icons">save</i>
</button>

<script>
	require(['settings'], function(Settings) {
		Settings.load('sso-vkontakte', $('.sso-vkontakte-settings'));

		$('#save').on('click', function() {
			Settings.save('sso-vkontakte', $('.sso-vkontakte-settings'), function() {
				app.alert({
					type: 'success',
					alert_id: 'sso-vkontakte-saved',
					title: 'Settings Saved',
					message: 'Please reload your NodeBB to apply these settings',
					clickfn: function() {
						socket.emit('admin.reload');
					}
				})
			});
		});
	});
</script>