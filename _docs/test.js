let ua = navigator.userAgent;
document.getElementById("user_agent").innerText = ua;

$("#jquery").text($.fn.jquery);
$("#vue").html("Vue: {{ error }}");

let vue_app = new Vue({
  el: "#vue",
  data: { error: Vue.version }
});
