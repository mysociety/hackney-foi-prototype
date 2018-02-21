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

// A utility function for extracting a list of subjects from the
// given state object. If no subjects are stored in the state object,
// return an empty list.
var getSubjects = function getSubjects(stateObject) {
    var subjects = [];
    if ( typeof stateObject['sar-subjects'] === 'object' ) {
        if ( stateObject['sar-subjects'].length > 0 ) {
            subjects = stateObject['sar-subjects'];
        }
    }
    return subjects;
}

// Similar to the .js-session-store change event handler, except, rather than
// just saving directly into the session, it constructs a "subjects" list,
// that _then_ gets saved as session["sar-subjects"].
var saveSarSubjectField = function saveSarSubjectField($el, subjectIndex) {
    var currentSession = window.sessions.current() || window.sessions.create(true);
    var subjects = getSubjects(currentSession);
    var name = $el.attr('name');

    if ( ! isset(subjects[subjectIndex]) ) {
        subjects[subjectIndex] = {};
    }

    // This bit is ripped off from .js-session-store.
    if ( $el.is('input[type="radio"], input[type="checkbox"]') ) {
        if ( $el.prop('checked') ) {
            subjects[subjectIndex][name] = $el.val();
        } else if ( isset(subjects[subjectIndex][name]) ) {
            delete subjects[subjectIndex][name];
        }

    } else if ( $el.is('input, textarea, select') ) {
        var val = $el.val();

        if ( val ) {
            subjects[subjectIndex][name] = val;
        } else if ( isset(subjects[subjectIndex][name]) ) {
            delete subjects[subjectIndex][name];
        }
    }

    currentSession["sar-subjects"] = subjects;
    window.sessions.save(currentSession);
}

var setUpSarPersonBuilder = function setUpSarPersonBuilder(){
    var currentSession = window.sessions.current() || window.sessions.create(true);
    var subjects = getSubjects(currentSession);
    var template = $.templates("#sarSubjectDetails");
    var $container = $(this);

    // This is the core of the whole thing - given the data required to describe
    // a person, it creates the form for that person, with all the right data
    // pre-populated, and all the necessary event listeners bound to the inputs
    // to handle saving of user input and stuff like that.
    var createPersonForm = function createPersonForm(subjectIndex, subject) {
        var $personForm = $( template.render({
            subject: subject,
            i: subjectIndex
        }) );

        $personForm.on('change', '.form-control', function(){
            saveSarSubjectField($(this), subjectIndex);
        });

        setUpTextReflectsInput($personForm, true);
        setUpShowIfYoungerThan18($personForm, true);

        return $personForm;
    }

    $container.empty();

    // No subjects are stored in the session. So, let's seed the data for a
    // first one, which will get saved when the user starts changing values.
    if ( subjects.length === 0 ) {
        if ( isset(currentSession['sar-subject-myself']) ) {
            subjects.push({
                "is-requestor": true,
                "subject-name": currentSession['sar-requestor-name']
            });
            // We're going to autopopulate the first subject name input
            // with the requestor's name. But, if the user never triggers
            // a "change" event on that input, the value will never get
            // saved. We could trigger the "change" event manually, but
            // the DOM element hasn't actually been created yet, so it's
            // easier to just save the subject right now.
            currentSession["sar-subjects"] = subjects;
            window.sessions.save(currentSession);
        } else {
            subjects.push({});
        }
    }

    $.each(subjects, function(subjectIndex, subject){
        var $personForm = createPersonForm(subjectIndex, subject);
        $personForm.appendTo($container);
    });

    if ( isset(currentSession['sar-subject-myself']) && !isset(currentSession['sar-subject-others']) ) {
        if ( subjects.length === 1 ) {
            $container.prev('h1').text('Tell us more about yourself');
        }
    } else {
        var $addButton = $('<button>')
            .addClass('sar-person sar-person--add')
            .text('Add another person')
            .on('click', function(){
                var $personForm = createPersonForm($addButton.prevAll('.sar-person').length, {});
                $personForm.insertBefore($addButton);
            })
            .appendTo($container);
    }
}

var setUpSarDocumentOptions = function setUpSarDocumentOptions() {
    var currentSession = window.sessions.current() || window.sessions.create(true);
    var subjects = getSubjects(currentSession);
    var template = $.templates("#sarSubjectDocumentOptions");
    var $container = $(this);

    var createPersonForm = function createPersonForm(subjectIndex, subject) {
        var $personForm = $( template.render({
            subject: subject,
            i: subjectIndex,
            requiresProofOfAddress: subjectRequiresProofOfAddress(subject),
            requiresLetterOfAuthority: subjectRequiresLetterOfAuthority(subject)
        }) );

        $personForm.on('change', '.form-control', function(){
            saveSarSubjectField($(this), subjectIndex);
        });

        return $personForm;
    }

    $container.empty();

    if ( subjects.length ) {
        $.each(subjects, function(subjectIndex, subject){
            var $personForm = createPersonForm(subjectIndex, subject);
            $personForm.appendTo($container);
        });
    } else {
        window.location.href = 'proof-1.html';
    }
}

var setUpSarDocumentUpload = function setUpSarDocumentUpload() {
    var currentSession = window.sessions.current() || window.sessions.create(true);
    var subjects = getSubjects(currentSession);
    var template = $.templates("#sarSubjectDocumentUpload");
    var $container = $(this);

    var createPersonForm = function createPersonForm(subjectIndex, subject) {
        var $personForm = $( template.render({
            subject: subject,
            i: subjectIndex,
            requiresProofOfAddress: subjectRequiresProofOfAddress(subject),
            requiresLetterOfAuthority: subjectRequiresLetterOfAuthority(subject)
        }) );
        return $personForm;
    }

    $container.empty();

    if ( subjects.length ) {
        $.each(subjects, function(subjectIndex, subject){
            var $personForm = createPersonForm(subjectIndex, subject);
            $personForm.appendTo($container);
        });
    } else {
        window.location.href = 'proof-1.html';
    }
}

var setUpTextReflectsInput = function setUpTextReflectsInput($context, force){
    var $context = $context || document;
    $('[data-text-reflects-input]', $context).each(function(){
        var $el = $(this);
        var originalText = $el.text();
        var $input = $( $el.attr('data-text-reflects-input'), $context );

        var updateText = function updateText() {
            var inputVal = $.trim( $input.val() );
            if ( inputVal === '' ){
                $el.text(originalText);
            } else {
                $el.text(inputVal);
            }
        };

        $input.on('change', updateText);

        if ( force ) {
            updateText();
        }
    });
}

var setUpShowIfYoungerThan18 = function setUpShowIfYoungerThan18($context, force) {
    var $context = $context || document;
    $('[data-show-if-younger-than-18]', $context).each(function(){
        var $el = $(this);
        var $input = $( $el.attr('data-show-if-younger-than-18'), $context );

        var updateVisibility = function updateVisibility() {
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
        }

        $input.on('change', updateVisibility);

        if ( force ) {
            updateVisibility();
        }
    });
}

var subjectRequiresProofOfAddress = function subjectRequiresProofOfAddress(subject) {
    if ( isset(subject['subject-dob']) && ageInYears(subject['subject-dob']) > 12 ) {
        return true;
    } else {
        return false;
    }
}

var subjectRequiresLetterOfAuthority = function subjectRequiresLetterOfAuthority(subject) {
    if ( isset(subject['is-requestor']) ) {
        return false;
    } else if (
        isset(subject['subject-dob']) &&
        ageInYears(subject['subject-dob']) < 13 &&
        isset(subject['requestor-has-parental-responsibility'])
    ) {
        return false;
    } else if ( ! isset(subject['subject-dob']) ) {
        return false;
    } else {
        return true;
    }
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

    $('.js-sar-subject-details').each(setUpSarPersonBuilder);

    $('.js-sar-document-options').each(setUpSarDocumentOptions);

    $('.js-sar-document-upload').each(setUpSarDocumentUpload);

    $('[data-path-if-nothing-to-upload]').each(function(){
        var $button = $(this);

        $button.on('click', function(e){
            e.preventDefault();
            var path = $button.attr('data-path-if-nothing-to-upload');

            $('.sar-person input[name="document-delivery-method"][value="upload-now"]').each(function(){
                if ( $(this).is(':checked') ) {
                    path = $button.attr('href');
                    return false;
                }
            });

            window.location.href = path;
        });
    });

    // setUpTextReflectsInput();
    // setUpShowIfYoungerThan18();

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
