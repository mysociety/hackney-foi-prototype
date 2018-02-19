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

// Calculate distance, in years, between a birth date and either "now" or
// a second date. Arguments can be either Date objects or date-like strings.
// Returns an "age" as an integer.
// Based on: https://stackoverflow.com/a/35302332
var ageInYears = function ageInYears(birthDate, ageAtDate){
    if (typeof ageAtDate == "undefined") {
        ageAtDate = new Date();
    }

    if (Object.prototype.toString.call(birthDate) !== '[object Date]') {
        birthDate = new Date(birthDate);
    }
    if (Object.prototype.toString.call(ageAtDate) !== '[object Date]') {
        ageAtDate = new Date(ageAtDate);
    }

    // Dates will be `null` if Date() conversion failed.
    if (ageAtDate == null || birthDate == null) {
        return null;
    }

    // If month and day of ageAtDate is *before* month and day of birthDate,
    // (eg: it is now 1st Feb, but birth date is in July) then we will want
    // to subtract 1 from the final year total.
    var nextyear = 0;
    var _m = ageAtDate.getMonth() - birthDate.getMonth();
    if ( _m < 0 || (_m === 0 && ageAtDate.getDate() < birthDate.getDate()) ) {
        nextyear = 1;
    }

    return ageAtDate.getFullYear() - birthDate.getFullYear() - nextyear;
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

    $('[data-text-reflects-input]').each(function(){
        var $el = $(this);
        var originalText = $el.text();
        var $input = $( $el.attr('data-text-reflects-input') );

        $input.on('change', function(){
            var inputVal = $.trim( $input.val() );
            if ( inputVal === '' ){
                $el.text(originalText);
            } else {
                $el.text(inputVal);
            }
        });
    });

    $('[data-show-if-younger-than-18]').each(function(){
        var $el = $(this);
        var $input = $( $el.attr('data-show-if-younger-than-18') );

        $input.on('change', function(){
            var inputVal = $.trim( $input.val() );
            if ( inputVal === '' ){
                $el.addClass('js-hidden');
            } else {
                if ( ageInYears($input.val()) < 18 ) {
                    $el.removeClass('js-hidden');
                } else {
                    $el.addClass('js-hidden');
                }
            }
        });
    });

    // Pre-fill sar-subject-name with sar-requestor-name, if sar-subject==='myself'
    $('input[name="sar-subject"]').on('change', function(){
        if ( $('#sar-subject-myself').is(':checked') ) {
            var currentSession = window.sessions.current() || window.sessions.create(true);
            if ( isset(currentSession['sar-requestor-name']) ) {
                currentSession['sar-subject-name'] = currentSession['sar-requestor-name'];
                window.sessions.save(currentSession);
            }
        }
    });

    // Hide the multi-person stuff if sar-subject==='myself'
    if ( $('body').is('.sar-proof-1') ) {
        var currentSession = window.sessions.current() || window.sessions.create(true);
        if ( isset(currentSession['sar-subject']) && currentSession['sar-subject'] == 'myself' ) {
            $('h1').text('Tell us more about yourself');
            $('label[for="sar-subject-other-names"]').text('Other names you have used');
            $('.sar-person--add').hide();
        }
    };

    // Skip proof-3 (upload) page if another provision method is selected.
    $('input[name="sar-proof-delivery-method"]').on('change', function(){
        var $nextButton = $('.cta-section .button:last-child');
        if ( $('#sar-proof-delivery-method-upload-now').is(':checked') ) {
            $nextButton.attr('href', 'proof-3.html');
        } else {
            $nextButton.attr('href', 'type.html');
        }
    });

    $('.js-sar-complete-proof-reminder').each(function(){
        var currentSession = window.sessions.current() || window.sessions.create(true);
        var $container = $(this);
        var proofDelivery = currentSession['sar-proof-delivery-method'];
        if ( isset(proofDelivery) && proofDelivery !== 'upload-now' ) {
            var template = $.templates("#sarCompleteProofReminder");
            $container.show().html( template.render({
                currentSession: currentSession,
                submitted: $('body').is('.sar-complete')
            }) );
        } else {
            $container.hide();
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

        // We have changed the contents of the element, so we should be nice
        // citizens and trigger a `change` event, in case any other `change`
        // listeners have been attached to this element.
        // We're reading directly out of the session store, however, so it
        // would be wasteful to trigger *our own* sessions.save() listener.
        // We tell our `change` listener to ignore the event by passing a
        // custom argument of "ignore", which it knows to look out for.
        $el.trigger('change', ['ignore']);
    });

    $('.js-session-store').on('change', function(e, customArgument){
        // If customArgument === 'ignore' then this event has been generated
        // by our own $('.js-session-store').each() callback, and we know the
        // element's contents will be fresh out of the store, so we don't need
        // to waste time saving them again.
        if ( customArgument === 'ignore' ) {
            return;
        }

        var currentSession = window.sessions.current() || window.sessions.create(true);
        var $el = $(this);
        var name = $el.attr('name');

        if ( $el.is('input[type="radio"], input[type="checkbox"]') ) {
            if ( $el.prop('checked') ) {
                currentSession[name] = $el.val();
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
