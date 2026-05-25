/**class doc*/
@IsTest
private with sharing class DocAnnotationsModifiers{
/**method doc*/
@AuraEnabled(cacheable=true)
public static String loadName(Id accountId){return 'A';}
/**prop doc*/
@TestVisible
private static String token{get;set;}
}
