/*
 * selectText()
 */
function selectText(e){
    var t=document.getElementById(e);var n=window.getSelection();var r=document.createRange();r.selectNodeContents(t);n.removeAllRanges();n.addRange(r)
}
