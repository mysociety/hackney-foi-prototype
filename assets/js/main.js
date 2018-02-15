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

$(function(){
    $('[data-aside]').each(function(){
        var $control = $(this);
        var $aside = $( $(this).attr('data-aside') );

        $control.on('focus', function(){
            $aside.addClass('form-aside--active');
        });
    });

    $('.js-session-list').each(function(){
        refreshSessionList($(this));
    });
});
