// Default JsRender delimiters `{{…}}` conflict with Jekyll/Liquid.
$.views.settings.delimiters("[[", "]]");

var refreshSessionList = function refreshSessionList(){
    var listElement = this;
    var allSessions = window.sessions.all();
    var template = $.templates("#sessionList");

    $(listElement).html( template.render({allSessions: allSessions}) );

    $('.js-resume-session', $(listElement)).on('click', function(){
        window.sessions.resume( $(this).attr('data-session-id') );
        refreshSessionList.call(listElement);
    });

    $('.js-deactivate-session').on('click', function(){
        window.sessions.deactivate( $(this).attr('data-session-id') );
        refreshSessionList.call(listElement);
    });

    $('.js-destroy-session').on('click', function(){
        window.sessions.delete( $(this).attr('data-session-id') );
        refreshSessionList.call(listElement);
    });

    $('.js-new-session', $(listElement)).on('click', function(){
        window.sessions.create(true);
        refreshSessionList.call(listElement);
    });

    $('.js-destroy-sessions').on('click', function(){
        window.sessions.deleteAll();
        refreshSessionList.call(listElement);
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

var setUpFadingAsideHints = function setUpFadingAsideHints() {
    var $control = $(this);
    var $aside = $( $(this).attr('data-aside') );

    $control.on('focus', function(){
        $aside.addClass('form-aside--active');
    });
}

var setUpTextThatReflectsInput = function setUpTextThatReflectsInput() {
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
}

var setUpShowIfYoungerThan18 = function setUpShowIfYoungerThan18() {
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
}

var validateMatchingInputs = function validateMatchingInputs() {
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
}

var populateSarProofReminder = function populateSarProofReminder() {
    var currentSession = window.sessions.current() || window.sessions.create(true);
    var $container = $(this);
    var proofDelivery = currentSession['sar-proof-delivery-method'];
    if ( isset(proofDelivery) && proofDelivery !== 'upload' ) {
        var template = $.templates("#sarCompleteProofReminder");
        $container.show().html( template.render({
            currentSession: currentSession,
            submitted: $('body').is('.sar-complete')
        }) );
    } else {
        $container.hide();
    }
}

// Run this on subject.html to pre-set the first subject's "name"
// field to the requestor's name, if we know they are only making a
// request about themselves.
var preFillSarSubjectNameIfMyself = function preFillSarSubjectNameIfMyself() {
    if ( $('#sar-subject-myself').is(':checked') ) {
        var currentSession = window.sessions.current() || window.sessions.create(true);
        if ( isset(currentSession['sar-requestor-name']) ) {
            currentSession['sar-subject-name'] = currentSession['sar-requestor-name'];
            window.sessions.save(currentSession);
        }
    }
}

var setUpSarSubjectDetailBuilder = function setUpSarSubjectDetailBuilder() {
    var currentSession = window.sessions.current() || window.sessions.create(true);
    var $container = $(this);
    var template = $.templates("#sarSubjectDetailBuilder");

    $container.html( template.render({
        currentSession: currentSession
    }) );

    $('.js-add-another-sar-subject', $container).on('click', function(e){
        e.preventDefault();

        var $button = $(this);
        var template = $.templates("#sarSubjectDetail");
        var $form = $( template.render({
            currentSession: currentSession
        }) );

        $form.insertBefore($button);
        $('[data-aside]', $form).each(setUpFadingAsideHints);
        $('[data-text-reflects-input]', $form).each(setUpTextThatReflectsInput);
        $('[data-show-if-younger-than-18]', $form).each(setUpShowIfYoungerThan18);
    });

    $('[data-aside]', $container).each(setUpFadingAsideHints);
    $('[data-text-reflects-input]', $container).each(setUpTextThatReflectsInput);
    $('[data-show-if-younger-than-18]', $container).each(setUpShowIfYoungerThan18);
}

var populateSessionStoreElement = function populateSessionStoreElement() {
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
}

var saveSessionStoreInputValue = function saveSessionStoreInputValue(e, customArgument) {
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
}

$(function(){
    $('[data-aside]').each(setUpFadingAsideHints);

    $('[data-text-reflects-input]').each(setUpTextThatReflectsInput);

    $(document).on('change', '[data-inputs-must-match]', validateMatchingInputs);

    $('[data-show-if-younger-than-18]').each(setUpShowIfYoungerThan18);

    $(document).on('change', 'input[name="sar-subject"]', preFillSarSubjectNameIfMyself);

    // TODO: Refactor this out.
    // Skip proof-3 (upload) page if another provision method is selected.
    $(document).on('change', 'input[name="sar-proof-delivery-method"]', function(){
        var $nextButton = $('.cta-section .button:last-child');
        if ( $('#sar-proof-delivery-method-upload-now').is(':checked') ) {
            $nextButton.attr('href', 'proof-3.html');
        } else {
            $nextButton.attr('href', 'type.html');
        }
    });

    $('.js-sar-complete-proof-reminder').each(populateSarProofReminder);

    $('.js-sar-subject-detail-builder').each(setUpSarSubjectDetailBuilder);

    $('.js-session-list').each(refreshSessionList);

    $('.js-session-store').each(populateSessionStoreElement);

    $(document).on('change', '.js-session-store', saveSessionStoreInputValue);
});
