trigger WidgetTrigger on Widget__c(before insert,after update){
for(Widget__c widget:Trigger.new){
if(widget.Name==null){widget.Name='Widget';}
else{try{if(widget.Status__c==null){widget.Status__c='Draft';}}catch(Exception ex){System.debug(ex.getMessage());}finally{System.debug(widget.Name);}}
}
}
