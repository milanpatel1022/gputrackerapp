# Import libraries
import pandas as pd
import psycopg2
from config.config import config

from selenium import webdriver
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By


options = Options()
# options.add_argument('--headless')
options.add_argument('--user-agent="Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 640 XL LTE) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Mobile Safari/537.36 Edge/12.10166"')

driver = webdriver.Chrome(ChromeDriverManager().install(), options=options)


# Establish a connection to the database by creating a cursor object

# Connect to PostgreSQL
params = config()
conn = psycopg2.connect(**params)
print('Python connected to PostgreSQL!')


#create a new cursor
cur = conn.cursor()

# Read the table
cur.execute("""
SELECT url, type FROM gpus WHERE gid IN (SELECT gid FROM trackedgpus);
""")

#for every gpu being tracked
for row in cur:
    #go to product page
    url = str(row[0].rstrip())
    driver.get(url)

    #use bestbuy scraper if URL is for bestbuy
    if(row[1].rstrip() == "bestbuy"):
        content = driver.find_element(By.CLASS_NAME, 'fulfillment-fulfillment-summary').text
        
        if content == "Sold Out":
            print("out of stock")
        else:
            print("in stock")
    
    #use newegg scraper if URL is for newegg
    else:
        content = driver.find_element(By.CLASS_NAME, 'font-s_15').text

        if content == "OUT OF STOCK.":
            print("out of stock")
        else:
            print("in stock")


# Close the connection
conn.commit()
conn.close()