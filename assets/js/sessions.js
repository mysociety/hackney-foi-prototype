window.sessions = {

    // Return a list of all sessions in the store.
    // If there are no sessions yet, return an empty list.
    all: function() {
        return store.get('sessions') || [];
    },

    // Save an empty, new session into the store, and return it.
    // Optionally activate the session once it has been created.
    create: function(resume) {
        var newSession = {
            id: new Date().toISOString()
        };
        this.save(newSession);
        if ( resume ) {
            this.resume(newSession.id);
        }
        return this.get(newSession.id);
    },

    // Delete the session with the given ID.
    delete: function(id) {
        store.set(
            'sessions',
            this.all().filter(function(session){
                return session.id !== id;
            })
        );
    },

    // Delete all sessions.
    deleteAll: function() {
        store.set('sessions', []);
    },

    // Return the saved session with the given ID.
    // If no matching session is found, return undefined and raise a warning.
    get: function(id) {
        var matchingSessions = this.all().filter(function(session){
            return session.id === id;
        });
        if ( matchingSessions.length === 1) {
            return matchingSessions[0];
        } else {
            console.warn("get() found", matchingSessions.length, " sessions with id:", id);
            return undefined;
        }
    },

    // A low-level function, for returning the index of
    // the session with the given ID, in the store array.
    _getIndex: function(id) {
        var index = -1;
        var all = this.all();
        all.forEach(function(session, i){
            if ( session.id === id ) {
                index = i;
            }
        });
        return index;
    },

    // Save the given session object to the store, then return it.
    // If a session with a matching ID is found, it will be replaced.
    save: function(modifiedSession) {
        var all = this.all();
        var index = this._getIndex(modifiedSession.id);
        if ( index < 0 ) {
            all.push(modifiedSession);
        } else {
            all[index] = modifiedSession;
        }
        store.set('sessions', all);
        return modifiedSession;
    },

    // Return the current session from the store.
    // If no session is marked as current, return undefined.
    current: function() {
        var matchingSessions = this.all().filter(function(session){
            return session.hasOwnProperty('current') && session.current;
        });
        if ( matchingSessions.length === 1) {
            return matchingSessions[0];
        } else {
            return undefined;
        }
    },

    // Find the session with the given ID, and set it as current.
    // If no matching session is found, return undefined. Otherwise, return the session.
    activate: function(id) {
        var session = this.get(id);
        if ( session ) {
            session['current'] = true;
            return this.save(session);
        } else {
            console.warn("activate() could not find session with id:", id);
            return undefined;
        }
    },

    // Find the session with the given ID, and unset it as current.
    // If no matching session is found, return undefined. Otherwise, return the session.
    deactivate: function(id){
        var session = this.get(id);
        if ( session ) {
            delete session['current'];
            return this.save(session);
        } else {
            console.warn("deactivate() could not find session with id:", id);
            return undefined;
        }
    },

    // A useful combnation of activate() and deactivate().
    // Find the session with the given ID, and set it as the *only* current session.
    // If no matching session is found, return undefined. Otherwise, return the session.
    resume: function(id) {
        var newSession = this.get(id);
        if ( newSession ) {
            var currentSession = this.current();
            if ( currentSession ) {
                this.deactivate(currentSession.id);
            }
            return this.activate(newSession.id);
        } else {
            console.warn("resume() could not find session with id:", id);
            return undefined;
        }
    }

};
