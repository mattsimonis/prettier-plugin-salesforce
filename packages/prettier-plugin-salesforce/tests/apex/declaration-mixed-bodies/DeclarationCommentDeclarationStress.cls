/** Outer stress doc. */
@IsTest
private with sharing class DeclarationCommentDeclarationStress {
  // Interface line comment.
  /** Interface doc. */
  @TestVisible
  private interface Runner {
    // Signature line comment.
    /** Signature doc. */
    @Deprecated
    void run(List<Account> rows);

    // Nested type line comment.
    /** Nested type doc. */
    class InlineWorker {
      // Nested field line comment.
      /** Nested field doc. */
      @TestVisible
      private Integer seen;

      // Nested method line comment.
      /** Nested method doc. */
      @AuraEnabled(cacheable=true)
      public Integer weight(List<Account> rows) {
        Integer total = 0;
        {
          Integer localCount = rows == null ? 0 : rows.size();
          total += localCount;
        }
        for (Account row : rows) {
          if (row.Name == null) {
            continue;
          }
          total += row.Name.length();
        }
        return total;
      }
    }
  }

  // Enum line comment.
  /** Enum doc. */
  private enum Mode {
    // Constant line comment.
    /** Constant doc. */
    @Deprecated
    Fast('F'),
    Slow('S');

    private final String code;

    private Mode(String value) {
      code = value;
    }
  }

  // Inner type line comment.
  /** Worker doc. */
  @TestVisible
  private class WorkerImpl implements Runner {
    // Method line comment.
    /** Method doc. */
    public void run(List<Account> rows) {
      Integer moved = 0;
      if (rows == null) {
        return;
      }
      while (moved < rows.size()) {
        Account row = rows[moved];
        moved++;
        if (row.Name != null) {
          System.debug(row.Name);
        } else {
          System.debug('missing');
        }
      }
    }
  }

  // Dispatcher line comment.
  /** Dispatcher doc. */
  @AuraEnabled(cacheable=true)
  public static Integer summarize(List<Account> rows) {
    Integer total = 0;
    {
      Integer checkpoint = 1;
      total += checkpoint;
    }
    try {
      for (Account row : rows) {
        if (row.Name != null) {
          total += row.Name.length();
        }
      }
    } catch (Exception ex) {
      System.debug(ex.getMessage());
    } finally {
      System.debug('done');
    }
    switch on total {
      when 0 {
        return 0;
      }
      when else {
        return total;
      }
    }
  }
}
