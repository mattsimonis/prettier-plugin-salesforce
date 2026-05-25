// Seed values
Integer count=0;
String label='start';
/* keep control flow */
for(Integer i=0;i<4;i++){
  if(i==2){
    continue;
  }else if(i>2){
    break;
  }
  count+=i;
}
switch on count{
  when 0{
    label='zero';
  }
  when else{
    try{
      System.debug('count='+count);
    }catch(Exception ex){
      System.debug(ex.getMessage());
    }finally{
      System.debug(label);
    }
  }
}
