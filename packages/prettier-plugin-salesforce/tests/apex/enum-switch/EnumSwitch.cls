public enum WorkMode{
/** active mode */
@Deprecated ACTIVE('A'),
// paused mode
PAUSED('P');
private final String code;
private WorkMode(String codeValue){code=codeValue;}
public Integer rank(){switch on this{when ACTIVE{return 1;}when PAUSED{return 2;}when else{return 99;}}}
public static Integer sum(List<WorkMode> modes){
Integer total=0;
for(WorkMode mode:modes){
switch on mode{
when ACTIVE{total+=1;}
when PAUSED{total+=2;}
when else{total+=99;}
}
}
return total;
}
}
