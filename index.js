const session = require('express-session');
	passport = require('passport');

module.exports = function(settingsCallback) {
	if(process.browser) return {};

	function runMiddleware(req, res, fn) {
		return new Promise((resolve, reject) => {
			fn(req, res, (result) => {
				if (result instanceof Error) {
					return reject(result)
				}

				return resolve(result)
			});
		})
	}

	const sessionOptions = settingsCallback(session);

	const baseMiddlewares = [
		session(sessionOptions),
		passport.initialize(),
		passport.session(),
	];

	async function applyMiddlewares(req, res) {
		for(let middleware of baseMiddlewares) {
			await runMiddleware(req, res, middleware);
		}
	}

	function control(next) {
		return async function(req, res) {
			await applyMiddlewares(req, res);
			await next(req, res);
		} 
	}

	function auth(strategy, successRedirect, failureRedirect) {
		return control(async function(req, res) {
			await runMiddleware(req, res, passport.authenticate(strategy, { successRedirect, failureRedirect }));
		});
	}

	function access(check, successAction, failureAction) {
		return async function(context) {
			const { req, res } = context;
			await applyMiddlewares(req, res);
			if(req.user && check(req.user)) {
				if(typeof successAction == 'string') {
					return {
						redirect: {
							destination: successAction,
							permanent: false,
						},
					};
				} else if(typeof successAction == 'function') {
					return await successAction(context);
				} else {
					return {
						props: {},
					};
				}
			} else {
				if(failureAction) {
					return {
						redirect: {
							destination: failureAction,
							permanent: false,
						},
					};
				} else {
					return {
						props: {},
					};
				}
			}
		};
	}

	async function getUser(req, res) {
		await applyMiddlewares(req, res);
		return req.user;
	}
	
	return {
		access,
		control,
		auth,
		getUser,
		passport,
	};
}
