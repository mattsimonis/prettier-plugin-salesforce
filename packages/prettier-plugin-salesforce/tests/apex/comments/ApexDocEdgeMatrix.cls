public class ApexDocEdgeMatrix{
/** class doc: kept exact */
@IsTest
private with sharing class Outer{
// line comment before method doc
/** method one doc: keep == and += */
@AuraEnabled(cacheable=true)
public static String first(Id accountId){return 'A';}

/** method two doc */
// line comment between doc and annotation
@Deprecated
public static void second(){System.debug('two');}

// line comment above property doc
/** property doc */
@TestVisible
private static String token{get;set;}

/** inner class doc */
@TestVisible
private class Inner{
// line comment before inner method doc
/** inner method doc */
@Deprecated
public void run(){System.debug('run');}
}
}
}
