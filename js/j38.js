"use strict";var j38={rotateAlerts:function(options){setInterval(function(){var currentAlert=$('#banner').find(".alert.visible");var nextAlert=currentAlert.next(".alert");if(nextAlert.length==0){nextAlert=$('#banner').find(".alert:first");}
currentAlert.fadeOut("slow",function(){currentAlert.removeClass("visible");nextAlert.fadeIn("slow",function(){nextAlert.addClass("visible");});});},10000)},loadAlerts:function(options){$.ajax({type:'GET',url:'https://www.scottmadethis.net/message/feed/',dataType:'xml',success:function(xml){var contents=$(xml).find("content\\:encoded, encoded");contents=j38.shuffle(contents);contents.each(function(){var alertP=$(this).text();var alertDiv=$("<div>").html($(alertP).html());alertDiv.addClass("alert");$('#banner').append(alertDiv);});}});},shuffle:function(array){for(var i=array.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var temp=array[i];array[i]=array[j];array[j]=temp;}
return array;}}