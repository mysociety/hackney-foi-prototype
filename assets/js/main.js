$(function(){
    $('[data-aside]').each(function(){
        var $control = $(this);
        var $aside = $( $(this).attr('data-aside') );

        $control.on('focus', function(){
            $aside.addClass('form-aside--active');
        });
    });
});
