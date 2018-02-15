// Default JsRender delimiters `{{…}}` conflict with Jekyll/Liquid.
$.views.settings.delimiters("[[", "]]");

var refreshSessionList = function refreshSessionList($list){
    var allSessions = window.sessions.all();
    var template = $.templates("#sessionList");

    $list.html( template.render({allSessions: allSessions}) );

    $('.js-resume-session', $list).on('click', function(){
        window.sessions.resume( $(this).attr('data-session-id') );
        refreshSessionList($list);
    });

    $('.js-deactivate-session').on('click', function(){
        window.sessions.deactivate( $(this).attr('data-session-id') );
        refreshSessionList($list);
    });

    $('.js-destroy-session').on('click', function(){
        window.sessions.delete( $(this).attr('data-session-id') );
        refreshSessionList($list);
    });

    $('.js-new-session', $list).on('click', function(){
        window.sessions.create(true);
        refreshSessionList($list);
    });

    $('.js-destroy-sessions').on('click', function(){
        window.sessions.deleteAll();
        refreshSessionList($list);
    });
};

var isset = function isset(thing){
    return ( typeof thing !== 'undefined' );
}

$(function(){
    $('[data-aside]').each(function(){
        var $control = $(this);
        var $aside = $( $(this).attr('data-aside') );

        $control.on('focus', function(){
            $aside.addClass('form-aside--active');
        });
    });

    $('[data-inputs-must-match]').on('change', function(){
        var $el = $(this);
        var $twin = $( $el.attr('data-inputs-must-match') );
        var $formGroup = $el.parents('.form-group');

        if ( $el.val() == $twin.val() ) {
            $formGroup.removeClass('form-group-error');
            $formGroup.find('.error-message').remove();
            $formGroup.find('.form-control-error').removeClass('form-control-error');
        } else {
            var $error = $('<span role="alert">').addClass('error-message');
            $error.text( $el.attr('data-inputs-mismatch-hint') );
            $error.insertBefore( $el );
            $formGroup.addClass('form-group-error');
            $formGroup.find('.form-control').addClass('form-control-error');
        }
    });

    $('.js-session-list').each(function(){
        refreshSessionList($(this));
    });

    $('.js-session-store').each(function(){
        var currentSession = window.sessions.current() || window.sessions.create(true);
        var $el = $(this);
        var name = $el.attr('name') || $el.attr('id'); // non-form-elements will have an id rather than a name

        if ( $el.is('input[type="radio"], input[type="checkbox"]') ) {
            var bool = isset(currentSession[name]) && currentSession[name] == $el.val();
            $el.prop('checked', bool);

        } else if ( $el.is('select[multiple]') ) {
            $el.children('option').each(function(){
                var bool = isset(currentSession[name]) && currentSession[name].indexOf($(this).attr('value') > -1);
                $(this).prop('selected', bool);
            });

        } else if ( $el.is('input, textarea, select') ) {
            $el.val( currentSession[name] ? currentSession[name] : null );

        } else {
            $el.text( currentSession[name] ? currentSession[name] : '' );

        }
    });

    $('.js-session-store').on('change', function(){
        var currentSession = window.sessions.current() || window.sessions.create(true);
        var $el = $(this);
        var name = $el.attr('name');

        if ( $el.is('input[type="radio"], input[type="checkbox"]') ) {
            if ( $el.prop('checked') ) {
                currentSession[name] = true;
            } else if ( isset(currentSession[name]) ) {
                delete currentSession[name];
            }

        } else if ( $el.is('input, textarea, select') ) {
            var val = $el.val();

            if ( val ) {
                currentSession[name] = val;
            } else if ( isset(currentSession[name]) ) {
                delete currentSession[name];
            }
        }

        window.sessions.save(currentSession);
    });
});
