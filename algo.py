# IMPORTS
import psycopg2
import json
import time
from datetime import datetime, timedelta

# Connect to PostgreSQL
connection = psycopg2.connect(user = "postgres", host = "127.0.0.1", port = "5432", database = "snuTreats")

## Order Table Columns Index
# 1,        2,        3,       4,        5,         6,      7
# order_id, username, item_id, quantity, timestamp, status, vendor_uname

cur = connection.cursor()
#cur.execute('CREATE TABLE sorted_orders(id serial PRIMARY KEY, order_id serial, username VARCHAR(50), item_id serial, quantity serial, timestamp VARCHAR(50), status VARCHAR(50), vendor_uname VARCHAR(50))')
vendorUsernames = ['shop1','shop2','shop3', 'shop4', 'shop5', 'shop6', 'shop7'] 

# To store sorted orders of all vendors
mainList = []

# Deletes old orders and adds sorted ones
def rebootTable():
    cur.execute('DELETE FROM sorted_orders')
    jsonList = []
    for orders in mainList:
        for order in orders:
            #cur.execute('INSERT INTO sorted_orders(order_id, username, item_id, quantity, timestamp, status, vendor_uname) VALUES(\'{}\',\'{}\',\'{}\',\'{}\',\'{}\',\'{}\',\'{}\')'.format(order[1], order[2], order[3], order[4], order[5], order[6], order[7]))
            obj = {
                'order_id': order[1],
                'username': order[2],
                'item_id': order[3],
                'quantity': order[4],
                'timestamp': str(order[5]),
                'status': order[6],
                'vendor_uname': order[7]
            }
            jsonList.append(obj)
    jsonStr = json.dumps(jsonList)
    with open('jsonOrderList.txt', 'w') as orderListFile:
        orderListFile.write(jsonStr)

# Sort orders on the basis of top order's bucket size
def sortOrders(orderList):
    firstOrder = orderList[0]
    orderListCopy = orderList
    currentIndex = 0
    ordersRearranged = 1

    cur.execute('select * from menu_items WHERE id=\'{}\''.format(firstOrder[3]))
    row = cur.fetchone()
    bucketSize = row[6]

    for order in orderList:
        if(currentIndex == 0):
            currentIndex = currentIndex+1
            continue
        if(order[3] == firstOrder[3] and bucketSize >= ordersRearranged+1):
            temp = order
            orderListCopy.pop(currentIndex)
            orderListCopy.insert(0, temp)
            ordersRearranged = ordersRearranged+1

        currentIndex = currentIndex+1

    mainList.append(orderListCopy)


# Create Order Pools for every item in the list
def createOrderPools(orderList):
    startIndex = 0;
    poolList = []
    startPre = None

    while startIndex < len(orderList):
        firstOrder = orderList[startIndex]
        orderListCopy = orderList
        currentIndex = startIndex
        ordersRearranged = 0

        # Get bucketSize
        cur.execute('select * from menu_items WHERE id=\'{}\''.format(firstOrder[3]))
        row = cur.fetchone()
        bucketSize = row[6]

        # Get Prep Time
        cur.execute('select * from menu_items WHERE id=\'{}\''.format(firstOrder[3]))
        row = cur.fetchone()
        prepTime = row[5]

        if firstOrder[8] == None:
            cur.execute('UPDATE orders SET est_time=\'{}\' WHERE id={}'.format(str(datetime.now() + timedelta(minutes=prepTime)), firstOrder[0]))
            if startPre == None:
               orderList[startIndex][8] = str(datetime.now() + timedelta(minutes=prepTime))
               startPre = datetime.now() + timedelta(minutes=prepTime)
            else:
               orderList[startIndex][8] = str(startPre + timedelta(minutes=prepTime))
                
                

        for order in orderList[currentIndex:]:
            if(order[3] == firstOrder[3] and bucketSize >= ordersRearranged+1):
                temp = order
                if(temp[8] == None):
                    cur.execute('UPDATE orders SET est_time=\'{}\' WHERE id={}'.format(firstOrder[8], temp[0]))
                    temp[8] = firstOrder[8]
                orderListCopy.pop(currentIndex)
                orderListCopy.insert(startIndex, temp)
                ordersRearranged = ordersRearranged+1
            currentIndex = currentIndex+1

        startIndex = startIndex + ordersRearranged
        poolList = orderListCopy
        orderList = orderListCopy
    for p in poolList:
        print(p)    
    return poolList
            

## Main
for vendorUsername in vendorUsernames:
    cur.execute('select * from orders where vendor_uname=\'{}\' and status=\'{}\''.format(vendorUsername, 'NOT PREPARED'))
    templist = []
    try:
        row = list(cur.fetchone())
        templist.append(row)
    except:
        pass
    try:
        while row is not None:
            row = list(cur.fetchone())
            templist.append(row)
    except:
        pass
    if(len(templist) > 0):
        #sortOrders(templist)
        createOrderPools(templist)

#rebootTable()
