// Default JsRender delimiters `{{…}}` conflict with Jekyll/Liquid.
$.views.settings.delimiters("[[", "]]");

$.views.helpers("listToHumanString", function(list, andor){
    if ( list.length == 0 ) {
        return '';
    } else if ( list.length == 1 ) {
        return '' + list[0];
    } else if ( list.length == 2 ) {
        return ' ' + list[0] + ' ' + andor + ' ' + list[1];
    } else {
        var r = '';
        // Keep removing the first item from the list, until it’s empty.
        while ( list.length > 0 ) {
            if ( list.length === 1 ) {
                // Last item!
                r += andor + ' ' + list.shift();
            } else {
                r += list.shift() + ', ';
            }
        }
        return r;
    }
});

$.views.helpers("ucfirst", function(str){
    return str.charAt(0).toUpperCase() + str.slice(1);
});

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
        setUpCombineDateFields($personForm, true);
        setUpShowIfYoungerThan18($personForm, true);

        return $personForm;
    }

    $container.empty();

    // No subjects are stored in the session. So, let's seed the data for a
    // first one, which will get saved when the user starts changing values.
    if ( subjects.length === 0 ) {
        if (
            isset(currentSession['sar-subject']) && (
                currentSession['sar-subject'] === 'me' ||
                currentSession['sar-subject'] === 'me-and-others'
            )
        ) {
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

    if ( isset(currentSession['sar-subject']) && currentSession['sar-subject'] === 'me' ) {
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
            proofOfAddressOptions: getProofOfAddressOptionsForSubject(subject)
        }) );

        $personForm.on('change', '.form-control', function(){
            saveSarSubjectField($(this), subjectIndex);
            toggleProofUploadCTA();
        });

        return $personForm;
    }

    $container.empty();

    if ( subjects.length ) {
        $.each(subjects, function(subjectIndex, subject){
            var $personForm = createPersonForm(subjectIndex, subject);
            $personForm.appendTo($container);
        });

        toggleProofUploadCTA();
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
            proofOfAddressOptions: getProofOfAddressOptionsForSubject(subject)
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

var toggleProofUploadCTA = function toggleProofUploadCTA(){
    var $ctaSection = $('.js-sar-proof-upload-cta');
    var nothingToUpload = true;

    $('.sar-person input[name="document-delivery-method"][value="upload-now"]').each(function(){
        if ( $(this).is(':checked') ) {
            nothingToUpload = false;
            return false;
        }
    });

    if (nothingToUpload) {
        $('a[href="proof-3.html"]', $ctaSection).addClass('js-hidden');
        $('a[href="type.html"]', $ctaSection).removeClass('js-hidden');
    } else {
        $('a[href="proof-3.html"]', $ctaSection).removeClass('js-hidden');
        $('a[href="type.html"]', $ctaSection).addClass('js-hidden');
    }
}

var setUpSarProxyOptions = function setUpSarProxyOptions() {
    $(this).on('change', toggleSarProxyCTA);
    toggleSarProxyCTA();
}

var toggleSarProxyCTA = function toggleSarProxyCTA() {
    var $ctaSection = $(this).find('.cta-section');

    if ( $('[name="sar-proxy"][value="yes"]').is(':checked') ) {
        $('a[href="subject.html"]', $ctaSection).addClass('js-hidden');
        $('a[href="proof-1.html"]', $ctaSection).removeClass('js-hidden');
    } else {
        $('a[href="subject.html"]', $ctaSection).removeClass('js-hidden');
        $('a[href="proof-1.html"]', $ctaSection).addClass('js-hidden');
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

var setUpCombineDateFields = function setUpCombineDateFields($context, force) {
    var $context = $context || document;
    $('[data-combine-date-fields-into]', $context).each(function(){
        var $fieldset = $(this);

        var updateTarget = function updateTarget() {
            var $target = $( $fieldset.attr('data-combine-date-fields-into'), $context );
            var day = $.trim( $fieldset.find('input[name$="-day"]').val() );
            var month = $.trim( $fieldset.find('input[name$="-month"]').val() );
            var year = $.trim( $fieldset.find('input[name$="-year"]').val() );

            if (
                isset(day) && day !== '' &&
                isset(month) && month !== '' &&
                isset(year) && year !== '' && parseInt(year) > 999
            ) {
                var combined = '' + year + '-' + month + '-' + day;
                $target.val(combined).trigger('change');
            } else {
                $target.val('').trigger('change');
            }
        }

        $fieldset.on('change keyup', function(){
            updateTarget();
        });

        if ( force ) {
            updateTarget();
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

var getProofOfAddressOptionsForSubject = function getProofOfAddressOptionsForSubject(subject) {
    var options = [];

    if ( isset(subject['subject-dob']) && ageInYears(subject['subject-dob']) > 12 ) {
        options.push('bank statement');

        if ( ageInYears(subject['subject-dob']) < 18 ) {
            options.push('doctor’s letter');
        }

        if ( ageInYears(subject['subject-dob']) > 12 ) {
            options.push('utility bill');
            options.push('council tax bill');
        }
    }

    return options;
}

var subjectRequiresLetterOfConsent = function subjectRequiresLetterOfConsent(subject) {
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

var setUpSarSubjectSummary = function setUpSarSubjectSummary(){
    var currentSession = window.sessions.current() || window.sessions.create(true);
    var subjects = getSubjects(currentSession);
    var template = $.templates("#sarSubjectSummary");
    var $container = $(this);

    var createPersonSummary = function createPersonForm(subjectIndex, subject) {
        var $personSummary = $( template.render({
            subject: subject,
            i: subjectIndex,
            proofOfAddressOptions: getProofOfAddressOptionsForSubject(subject),
            requiresLetterOfConsent: subjectRequiresLetterOfConsent(subject)
        }) );
        return $personSummary;
    }

    $container.empty();

    if ( subjects.length ) {
        $.each(subjects, function(subjectIndex, subject){
            var $personSummary = createPersonSummary(subjectIndex, subject);
            $personSummary.appendTo($container);
        });
    } else {
        $container.append('<p>No subjects have been selected.</p>');
    }
}

var foiSuggestions = {
    "ceo-salary": [
        {
            title: "Senior officers’ pay",
            excerpt: "<strong>Top 3 tiers of employees earning over £50,000.</strong> Information on the top three tiers of employees earning over £50,000, which is updated once a year. Date at which the information provided is true: 1 November 2017.",
            url: "https://www.hackney.gov.uk/senior-officer-pay"
        },
        {
            title: "How the council works",
            excerpt: "In this introduction to the Council you can find out about the directly elected Mayor and who runs the Council. You can also find out about the Council's constitution, budget, finances, transparency and structure […] Chief Executive - Tim Shields […]",
            url: "https://www.hackney.gov.uk/how-the-council-works"
        }
    ],
    "carillion": [
        {
            title: "Council spending over £500 – Monthly spending reports",
            excerpt: "Each month we will publish a list of all payments we make over £500 showing who we paid, how much we paid and what this was for […] This includes: all individual items we purchase, payments made to contractors carrying out work on our behalf, and other spending we incur.",
            url: "https://www.hackney.gov.uk/budget-supplier-payments"
        },
        {
            title: "Selling to the council",
            excerpt: "The Council spends over £300 million every year on a wide range of goods, works and services to help us provide services to the people of Hackney […] <strong>Tender opportunities and contracts</strong> […] <strong>Work with the Council</strong> […]",
            url: "https://www.hackney.gov.uk/procurement"
        }
    ],
    "default": [
        {
            title: "An example request from the disclosure log",
            excerpt: "In the real world, this would be an automatically-generated excerpt of text from the disclosure log entry, helping the user work out whether this is useful of not.",
            url: "#"
        },
        {
            title: "A useful item from the publication scheme",
            excerpt: "This would be a text summary of a relevant page from the council’s publication scheme. Maybe it might be useful, maybe not.",
            url: "#"
        },
        {
            title: "A page from the council website",
            excerpt: "The suggestion index would also include high-traffic pages from the council website, in which case, an excerpt of useful text from the page would appear here.",
            url: "#"
        }
    ]
}

var showFoiSuggestions = function showFoiSuggestions() {
    var currentSession = window.sessions.current() || window.sessions.create(true);
    var scenario = 'default';
    var template = $.templates("#foiSuggestion");
    var $container = $(this);

    $container.empty();

    if ( isset(currentSession['scenario']) && foiSuggestions.hasOwnProperty(currentSession['scenario']) ) {
        scenario = currentSession['scenario'];
    }

    $.each(foiSuggestions[scenario], function(i, suggestion){
        $( template.render(suggestion) ).appendTo($container);
    });
}

var startScenario = function startScenario(e) {
    e.preventDefault();

    var $el = $(this);
    var url = $el.attr('href');
    var scenario = $el.attr('data-start-scenario');

    var currentSession = window.sessions.create(true);
    currentSession["scenario"] = scenario;
    window.sessions.save(currentSession);

    window.location.href = url;
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

    $('.js-foi-suggestions').each(showFoiSuggestions);

    $('.js-sar-proxy-options').each(setUpSarProxyOptions);

    $('.js-sar-subject-details').each(setUpSarPersonBuilder);

    $('.js-sar-document-options').each(setUpSarDocumentOptions);

    $('.js-sar-document-upload').each(setUpSarDocumentUpload);

    $('.js-sar-subject-summary').each(setUpSarSubjectSummary);

    $('.js-sar-complete-proof-reminder').each(function(){
        var currentSession = window.sessions.current() || window.sessions.create(true);
        var subjects = getSubjects(currentSession);
        var subjectsWithOutstandingDocuments = [];
        var template = $.templates("#sarCompleteProofReminder");
        var $container = $(this);

        $.each(subjects, function(subjectIndex, subject){
            if ( isset(subject['document-delivery-method']) && subject['document-delivery-method'] !== 'upload-now' ) {
                subject['proofOfAddressOptions'] = getProofOfAddressOptionsForSubject(subject);
                subjectsWithOutstandingDocuments.push(subject);
            }
        });

        if ( subjectsWithOutstandingDocuments.length ) {
            $container.show().html( template.render({
                currentSession: currentSession,
                subjects: subjectsWithOutstandingDocuments
            }) );
        } else {
            $container.hide().empty();
        }
    });

    $('.js-sar-complete-consent-warning').each(function(){
        var currentSession = window.sessions.current() || window.sessions.create(true);
        var subjects = getSubjects(currentSession);
        var subjectsNeedingLetterOfConsent = [];
        var $el = $(this);

        $el.hide();

        $.each(subjects, function(subjectIndex, subject){
            if ( subjectRequiresLetterOfConsent(subject) ) {
                subjectsNeedingLetterOfConsent.push(subject);
            }
        });

        if ( isset(currentSession['sar-proxy']) && currentSession['sar-proxy'] === 'yes' ) {
            var message = 'Since you are completing this form on behalf of someone else, we may contact you to ask for a <strong>Letter of Authority</strong>, before we can provide information about ' + (subjects.length === 1 ? 'this person' : 'these people') + '.';
        } else if ( subjectsNeedingLetterOfConsent.length ) {
            var message = 'We may contact you, to ask for <strong>Proof of Consent</strong>, before we can provide information about ' + (subjectsNeedingLetterOfConsent.length === 1 ? 'one' : 'some') + ' of the people in this request.';
        }

        $el.show().html(message);
    });

    $('[data-start-scenario]').on('click', startScenario);

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
