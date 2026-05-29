/**
 * Golden formatting fixture for Apex printer behavior.
 */
@IsTest
private with sharing class GoldenFormatting {
  @TestVisible
  private static final String ORDER_FULLY_UPSERTED_BUSINESS_EVENT = 'OrderFullyUpserted';
  private static Map<Id, List<CartItemLine__c>> cartItemLinesByCartItemId = new Map<Id, List<CartItemLine__c>>();

  @TestVisible
  private Account cachedAccount {
    get {
      if (cachedAccount == null) {
        cachedAccount = [SELECT Id, Name FROM Account WHERE Name = 'Golden' LIMIT 1];
      }
      return cachedAccount;
    }

    private set {
      if (value == null) {
        cachedAccount = null;
      } else {
        cachedAccount = value.clone(false);
      }
    }
  }

  /**
   * Exercises blank-line preservation, generics, control flow, calls, and wrapping.
   */
  public static void runGoldenPath(
    Id cartIdToSubmit,
    Order convertedOrder,
    TransactionGenerator.TransactionGenerationResult generationResult,
    Map<Id, List<CartItemLine__c>> couponCartItemLinesByCartItemId
  ) {
    TransactionGenerator.TransactionGenerationRequest request = new TransactionGenerator.TransactionGenerationRequest();
    request.cartId = cartIdToSubmit;
    request.orderId = convertedOrder.Id;

    for (List<CartItemLine__c> couponCartItemLines : couponCartItemLinesByCartItemId.values()) {
      cartItemLinesByCartItemId.put(cartIdToSubmit, couponCartItemLines);
    }

    if (
      !couponCartItemLinesByCartItemId.isEmpty()
      && (cartIdToSubmit != null
      || convertedOrder.Id != null)
      && TransactionGenerator.Service.Instance.isEnabled(convertedOrder.Id)
    ) {
      BusinessEventsService.Instance.reparentSchedules(
        cartIdToSubmit,
        getIdFromSObject(convertedOrder),
        generationResult.result
      );
      BusinessEventsService.Instance.handleBusinessEventByLabel(
        ORDER_FULLY_UPSERTED_BUSINESS_EVENT,
        convertedOrder.Id
      );
    } else {
      System.debug('No schedules to reparent');
    }

    update new List<Order> { convertedOrder };
  }

  public static Boolean shouldRegenerateOrderItem(CartItem__c cartItemToConvert) {
    return cartItemToConvert != null && cartItemToConvert.OrderItem__c != null
      && (hasAddressChanged(cartItemToConvert) ||
      cartItemToConvert.Customer__c != cartItemToConvert.OrderItem__r.Customer__c ||
      cartItemToConvert.PriceClass__c != cartItemToConvert.OrderItem__r.PriceClass__c ||
      cartItemToConvert.Recurring__c != cartItemToConvert.OrderItem__r.Recurring__c ||
      cartItemToConvert.TotalShipping__c != cartItemToConvert.OrderItem__r.TotalShipping__c ||
      cartItemToConvert.TotalTax__c != cartItemToConvert.OrderItem__r.TotalTax__c ||
      cartItemToConvert.SalesTax__c != cartItemToConvert.OrderItem__r.SalesTax__c ||
      isCartItemRecurringDataAdjusted(cartItemToConvert));
  }

  public static List<Account> loadAccounts(Set<Id> accountIds) {
    return [
      SELECT Id, Name, Owner.Name, BillingStreet, BillingCity, BillingState, BillingPostalCode, BillingCountry
      FROM Account
      WHERE Id IN :accountIds
      ORDER BY Name
      LIMIT 200
    ];
  }

  public static List<List<SObject>> searchAccountsAndContacts(String searchTerm) {
    return [
      FIND :searchTerm
      IN ALL FIELDS
      RETURNING Account(Id, Name, BillingCity, BillingState), Contact(Id, Name, Email, MailingCity, MailingState)
      LIMIT 50
    ];
  }

  public static void handleMode(Mode mode) {
    try {
      switch on mode {
        when Fast {
          System.debug('fast');
        }
        when Slow {
          System.debug('slow');
        }
        when else {
          System.debug('unknown');
        }
      }
    } catch (QueryException | DmlException ex) {
      System.debug(ex.getMessage());
    } finally {
      System.debug('done');
    }
  }

  private static Id getIdFromSObject(SObject record) {
    return record.Id;
  }

  private static Boolean hasAddressChanged(CartItem__c cartItemToConvert) {
    return cartItemToConvert.ShippingStreet__c != null
      || cartItemToConvert.ShippingPostalCode__c != cartItemToConvert.OrderItem__r.ShippingPostalCode__c;
  }

  private static Boolean isCartItemRecurringDataAdjusted(CartItem__c cartItemToConvert) {
    return cartItemToConvert.Term__c != null
      || cartItemToConvert.StartDate__c != cartItemToConvert.OrderItem__r.StartDate__c;
  }

  private interface Worker {
    void run(Integer attemptCount);
  }

  private enum Mode {
    Fast, Slow, Unknown
  }

  private class GoldenWorker implements Worker {
    public void run(Integer attemptCount) {
      Integer currentAttempt = 0;
      do {
        currentAttempt += 1;
      } while (currentAttempt < attemptCount);
    }
  }
}
