public class MixedLoopHeaders{
public static void run(Boolean ready,List<Account> rows){
for(Integer i=0;i<rows.size();i++){
if(ready){
try{do{rows[i].Count__c+=1;}while(ready&&rows[i].Count__c<5);}catch(Exception ex){System.debug(ex.getMessage());}finally{System.debug('tick');}
}
}
}
}
