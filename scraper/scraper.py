# Import libraries
import time
import psycopg2
import os
import sys
from time import sleep

from config.config import config

from selenium import webdriver
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

#import my email service from quickstart
from quickstart import helper


#options for our scraper to bypass warnings, to render elements correctly, etc.
options = Options()
# options.add_argument('--headless')
options.add_argument('--disable-gpu')
options.add_argument('--window-size=1920,1200')
options.add_argument('--no-sandbox')
options.add_argument('--allow-insecure-localhost')
options.add_argument('--log-level=3')
options.add_argument('--user-agent="Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 640 XL LTE) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Mobile Safari/537.36 Edge/12.10166"')

driver = webdriver.Chrome(ChromeDriverManager().install(), options=options)


# Establish a connection to the database by creating a cursor object
print('IN SCRAPER')
sys.stdout.flush()

DATABASE_URL = os.environ['DATABASE_URL']

conn = psycopg2.connect(DATABASE_URL, sslmode='require')

print('somestring')
sys.stdout.flush()


# # Connect to PostgreSQL
# params = config()
# conn = psycopg2.connect(**params)
# print('Python connected to PostgreSQL!')


#this function is called when a tracked GPU comes in stock so we can notify all the users tracking it
#gid, url to product, product name
def find_users(gid, url, name):
    cur = conn.cursor()

    #find all users tracking this gpu
    cur.execute("SELECT uid FROM userstogpus WHERE gid = (%s)", [gid])

    subject = "IN STOCK: %s" % name
    message = "Link: %s.\nNote: We are no longer tracking this item for you." % url

    #get their email
    for row in cur:
        uid = row[0]
        cur2 = conn.cursor()
        cur2.execute("SELECT email FROM users WHERE uid = (%s)", [uid])
        for i in cur2:
            email = i[0]
            helper("gputracker85@gmail.com", email, subject, message)
        
        #do not track this product for the user anymore
        #update userstogpus table
        cur3 = conn.cursor()
        cur3.execute("DELETE FROM userstogpus WHERE uid = (%s) AND gid = (%s)", [uid, gid])
        

        #update trackedgpus table. 1st get how many people are tracking the GPU
        cur4 = conn.cursor()
        cur4.execute("SELECT count FROM trackedgpus WHERE gid = (%s)", [gid])

        #if only this user was tracking the GPU, we remove the whole row
        for i in cur4:
            cur5 = conn.cursor()
            count = i[0]
            
            #if only this user was tracking the GPU, we remove the whole row
            if count == 1:
                print("row deleted from tracked")
                cur5.execute("DELETE FROM trackedgpus WHERE gid = (%s)", [gid])
            
            #else, we just decrement count to correctly reflect how many people are now tracking the GPU
            else:
                print("row updated in tracked")
                cur5.execute("UPDATE trackedgpus SET count = count - 1 WHERE gid = (%s)", [gid])
    
    conn.commit()
    return


while True:
    #create a new cursor
    cur = conn.cursor()

    # Read the table
    cur.execute("""
    SELECT gid, url, type, name FROM gpus WHERE gid IN (SELECT gid FROM trackedgpus);
    """)

    print("reading db")
    sys.stdout.flush()

    #for every gpu being tracked
    for row in cur:
        #extract information from each row in table
        gid = row[0]
        url = str(row[1].rstrip())
        site = str(row[2].rstrip())
        name = str(row[3].rstrip())

        print(name)

        #go to product page
        driver.get(url)

        sleep(3)

        #use bestbuy scraper if URL is for bestbuy
        if(site == "bestbuy"):            
            content = driver.find_element(By.CLASS_NAME, 'fulfillment-fulfillment-summary')
            
            sold = content.find_element(By.TAG_NAME, 'strong').text
        

            if sold == "Sold Out":
                print("out of stock")
            else:
                print("in stock")
                find_users(gid, url, name)
        
        #use newegg scraper if URL is for newegg
        else:
            content = driver.find_element(By.CLASS_NAME, 'font-s_15').text

            if content == "OUT OF STOCK.":
                print("out of stock")
            else:
                print("in stock")
                find_users(gid, url, name)
    

# Close the connection
conn.close()