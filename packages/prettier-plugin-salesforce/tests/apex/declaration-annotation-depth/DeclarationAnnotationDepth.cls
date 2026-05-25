public class DeclarationAnnotationDepth {
  /** interface doc */
  @TestVisible
  @Deprecated
  private interface Worker {
    /** run doc */
    @AuraEnabled(cacheable = true)
    @Deprecated
    public String run(Integer count);
  }

  /** enum doc */
  private enum Mode {
    /** fast doc */
    @Deprecated
    FAST('A'),
    /** slow doc */
    @Deprecated
    SLOW('B');

    private final String code;

    private Mode(String value) {
      code = value;
    }
  }

  /** inner doc */
  @TestVisible
  @Deprecated
  private class InnerWorker {
    /** execute doc */
    @AuraEnabled
    @Deprecated
    public void execute() {
      System.debug('ok');
    }
  }
}
